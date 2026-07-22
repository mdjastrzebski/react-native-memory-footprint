# react-native-memory-footprint

A tiny React Native library for reading your app's **real memory footprint** — the same number the OS uses to decide whether to kill your app under memory pressure — on iOS and Android.

Most "memory used" numbers you can get on-device (RSS, resident size, VM Tracker totals) count memory that isn't actually costing your app anything, like shared system libraries. This library returns the metric each platform uses for the moment it decides your app is using *too much* memory, so what you see here is what determines whether you get killed for using too much.

## Installation

```sh
npm install react-native-memory-footprint
```

## Usage

```js
import { getMemoryFootprint } from 'react-native-memory-footprint';

// Current app memory footprint, in bytes.
const bytes = getMemoryFootprint();
console.log(`${(bytes / 1024 / 1024).toFixed(2)} MB`);
```

## API

### `getMemoryFootprint(): number`

Returns the current memory footprint of the app process, in bytes.

| Platform | Underlying metric |
| --- | --- |
| iOS | `phys_footprint` from `task_info(TASK_VM_INFO)` — the same value shown in Xcode's memory gauge and used by Jetsam |
| Android | Total PSS (proportional set size) of the process, from `Debug.getMemoryInfo()` |

## How iOS memory footprint is calculated

If you've compared this number against Xcode's **VM Tracker** or **Debug Memory Graph**, you'll notice it doesn't match the resident size totals shown there — sometimes by a wide margin. That's expected, and it comes down to `phys_footprint` and VM Tracker measuring genuinely different things.

**VM Tracker sums *resident* pages** — every page currently sitting in physical RAM, regardless of who's actually being charged for it. A big chunk of that is memory your app doesn't own the cost of: code pages mapped from the shared dyld cache (`__TEXT`, `__LINKEDIT`), other clean/read-only mappings (`mapped file`) — pages the system can discard and reload for free, shared across every process on the device.

**`phys_footprint` is Apple's charged-memory accounting.** Per [WWDC 2018 Session 416, "iOS Memory Deep Dive"](https://devstreaming-cdn.apple.com/videos/wwdc/2018/416n2fmzz0fz88f/416/416_ios_memory_deep_dive.pdf), the mental model is:

> App memory = Dirty + Compressed. Clean memory is not considered being used.

Only pages your app has actually written to (dirty) and pages the compressor has squeezed out of residency (compressed) count. Clean, read-only, or shared pages don't — no matter how much RAM they occupy.

The precise version lives in the XNU kernel source ([`osfmk/kern/task.c`](https://github.com/apple/darwin-xnu/blob/main/osfmk/kern/task.c)), where `phys_footprint` is a ledger computed as:

```
phys_footprint = (internal - alternate_accounting)
                + (internal_compressed - alternate_accounting_compressed)
                + iokit_mapped
                + purgeable_nonvolatile
                + purgeable_nonvolatile_compressed
                + page_table
```

The detail that matters most in practice: it's **`internal`** memory — private, anonymous memory your process owns outright (malloc heap, JS engine heap, Objective-C/Swift objects, `VM_ALLOCATE`) — not just any dirty page. Dirty pages from **external**, file-backed regions (e.g. relocations applied to `__DATA_CONST` in the shared dyld cache at launch) get excluded via `alternate_accounting`, since that memory is shared across every process using the same cache and isn't uniquely yours to pay for.

So when reconciling against VM Tracker:
- Ignore `__TEXT`, `__LINKEDIT`, `__OBJC_RO`, `mapped file` — clean/shared, effectively free.
- `Dirty Size` + `Swapped` on **internal/anonymous** rows (`MALLOC_*`, `VM_ALLOCATE`, `dyld private memory`, `__DATA`, `CoreAnimation`, `IOSurface`, `Image IO`, ...) gets you close to the real number.
- `Dirty Size` + `Swapped` on **external/shared** rows (`__DATA_CONST`, mapped frameworks) mostly doesn't count, thanks to `alternate_accounting`.

**Bottom line:** treat `phys_footprint` (what this library reports) as ground truth for memory pressure and Jetsam risk. Use VM Tracker's per-region breakdown only to diagnose *where* dirty/compressed memory is coming from — not as a competing total.

### Further reading

- [darwin-xnu `task.c`](https://github.com/apple/darwin-xnu/blob/main/osfmk/kern/task.c) — the actual ledger field definitions (`internal`, `internal_compressed`, `alternate_accounting`, `iokit_mapped`, `purgeable_nonvolatile`)
- [WWDC 2018 Session 416 — "iOS Memory Deep Dive"](https://devstreaming-cdn.apple.com/videos/wwdc/2018/416n2fmzz0fz88f/416/416_ios_memory_deep_dive.pdf) (slides) and [session notes](https://gist.github.com/SheldonWangRJT/5d2ea69f78a905c76e0c36dfc994e85c)
- [Apple Developer Forums — `phys_footprint` and IOKit accounting](https://developer.apple.com/forums/thread/111551)

## How Android memory footprint is calculated

On Android, `getMemoryFootprint()` returns **total PSS** (Proportional Set Size) via [`Debug.getMemoryInfo()`](https://developer.android.com/reference/android/os/Debug.MemoryInfo) — the same source `dumpsys meminfo` uses. Per the [Android memory overview](https://developer.android.com/topic/performance/memory-overview):

> Android computes a value called the Proportional Set Size (PSS), which accounts for both dirty and clean pages that are shared with other processes — but only in an amount that's proportional to how many apps share that RAM. This (PSS) total is what the system considers to be your physical memory footprint.

So a 4K page shared evenly across two processes contributes 2K to each process's PSS. That proportional split is what makes PSS additive: sum the PSS of every process on the device and you get actual physical RAM in use, which is why the platform (and `dumpsys meminfo`) treats it as *the* number for a process's real weight — the direct Android analogue of iOS's `phys_footprint`.

This is a genuinely different calculation from **RSS** (Resident Set Size), which counts the *full* size of every shared page for every process that maps it — RSS is not additive across processes, and inflates for anything sharing memory with the system (Zygote-inherited ART boot image, shared native libraries, etc.).

That distinction matters if you're cross-checking against Android Studio's newer **Live Telemetry → Process Memory** view: per the [chart glossary](https://developer.android.com/studio/profile/chart-glossary/process-memory), its `Total` is explicitly RSS, not PSS:

> This is the total amount of physical memory in use by your process. On Unix-based systems, this is known as the "Resident Set Size" ... sourced from `/proc/[pid]/stat`.

In principle RSS should read *higher* than PSS, since it counts shared pages in full rather than proportionally. In practice, for a typical React Native app the shared portion of RSS (mostly the ART boot image and a handful of system `.so` mappings inherited from Zygote) is small and roughly constant, so RSS and PSS often converge closely at runtime — which is consistent with what you're seeing lining up almost exactly against Live Telemetry's `Total`. Don't take that as a guarantee: on a device/OS combination with heavier shared-memory use, expect RSS to run visibly above PSS.

**Bottom line:** treat `totalPss` (what this library reports) as ground truth — it's the metric Android itself defines as your app's physical footprint. Live Telemetry's `Total` (RSS) is a useful live chart, but it's answering a related, not identical, question.

### Further reading

- [Android memory overview](https://developer.android.com/topic/performance/memory-overview) — official PSS definition ("This total is what the system considers to be your physical memory footprint")
- [Android Studio chart glossary — Process memory (RSS)](https://developer.android.com/studio/profile/chart-glossary/process-memory) — what Live Telemetry's `Total` actually measures
- [`Debug.MemoryInfo`](https://developer.android.com/reference/android/os/Debug.MemoryInfo) — API reference (see `getTotalPss()`)
- [Proportional set size (Wikipedia)](https://en.wikipedia.org/wiki/Proportional_set_size) — general background on the PSS accounting model

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
