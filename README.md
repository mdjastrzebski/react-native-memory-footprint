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

const bytes = getMemoryFootprint();
console.log(`${(bytes / 1024 / 1024).toFixed(2)} MB`);
```

## API

### `getMemoryFootprint(): number`

Returns the current memory footprint of the app process, in bytes.

| Platform | Underlying metric |
| --- | --- |
| iOS | `phys_footprint` from `task_info(TASK_VM_INFO)` — the same value shown in Xcode's memory gauge and used by Jetsam |
| Android | Anonymous RSS + swap (`RssAnon` + `VmSwap` from `/proc/self/status`) — the same metric behind Play Console's "excessive memory usage" vitals |

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

Android doesn't have one canonical "memory footprint" metric the way iOS has `phys_footprint` — the term gets used loosely across its docs for at least three different measurements. Per the [Android memory management guide](https://developer.android.com/topic/performance/memory-management):

> To determine the memory footprint for an application, any of the following metrics may be used:
> - **Resident Set Size (RSS)**: The number of shared and non-shared pages used by the app
> - **Proportional Set Size (PSS)**: The number of non-shared pages used by the app and an even distribution of the shared pages (for example, if three processes are sharing 3MB, each process gets 1MB in PSS)
> - **Unique Set Size (USS)**: The number of non-shared pages used by the app (shared pages are not included)
>
> PSS is useful for the operating system when it wants to know how much memory is used by all processes since pages don't get counted multiple times.

`getMemoryFootprint()` reports **anonymous RSS + swap**: resident anonymous memory plus anonymous memory the compressor/swap has moved out of residency. This is the same metric behind Android vitals' "excessive memory usage" warning in Play Console. Per the [Play Vitals memory usage doc](https://developer.android.com/topic/performance/vitals/memory-usage):

> Anonymous memory is memory not backed by a file on storage, such as heap allocations and mmap-allocated memory. This captures your app's dynamic memory allocations, including the Java or Kotlin heap, unmanaged native heap allocations ..., and thread execution stacks. While the OS can drop file-backed memory under pressure, it can't drop anonymous memory. [...] Tracking anonymous RSS + swap ensures you see your app's true, unevictable memory footprint.

This is a deliberately different choice from PSS. PSS's proportional accounting exists so the system can add PSS across every process on the device without double-counting shared pages — useful for system-wide RAM bookkeeping, but not for judging whether *your* app is heavy or at risk of being killed. Android's low-memory killer daemon doesn't consult PSS at all when picking a victim: per the [AOSP `lmkd` source](https://android.googlesource.com/platform/system/memory/lmkd/+/master/lmkd.cpp), its `proc_get_size()` function reads RSS straight from `/proc/[pid]/statm`, and `proc_get_heaviest()` kills whichever eligible process has the largest RSS. Anonymous RSS + swap is the closer analogue to what actually determines memory pressure risk, and to iOS's `phys_footprint` (dirty + compressed, excluding evictable/shared memory).

### Where the numbers come from

`getMemoryFootprint()` reads `RssAnon` and `VmSwap` directly from `/proc/self/status`. Per the kernel's [`proc_pid_status(5)` man page](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html):

> **RssAnon**: Size of resident anonymous memory. (since Linux 4.5)
>
> **VmSwap**: Swapped-out virtual memory size by anonymous private pages; shmem swap usage is not included (since Linux 2.6.34).

Reading `/proc/self/status` is a single small file read with no IPC and no permission requirements (you're only ever reading your own process). That makes it considerably cheaper than the PSS-based alternative, `Debug.getMemoryInfo()`, which the library used before switching to this metric — that call walks your process's `/proc/self/smaps` to compute page-sharing and [takes on the order of 200ms](https://eng.lyft.com/detecting-android-memory-leaks-in-production-29e9c97e2ba1) per invocation. (A separate API, `ActivityManager.getProcessMemoryInfo()`, is throttled by the system to once per 5 minutes per process — see the [AOSP throttling commit](https://android.googlesource.com/platform/frameworks/base/+/8c76d91bd21135f63ef5e8756b1a2e342e81413f) — but that throttle doesn't apply to `Debug.getMemoryInfo()` itself.)

### Further reading

- [Android memory management guide](https://developer.android.com/topic/performance/memory-management) — RSS vs. PSS vs. USS
- [Memory usage (anonymous RSS + swap) — Play Vitals](https://developer.android.com/topic/performance/vitals/memory-usage) — official definition of the metric this library reports
- [`proc_pid_status(5)` man page](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html) — `RssAnon` / `VmSwap` field definitions
- [AOSP `lmkd` source — `proc_get_size()`](https://android.googlesource.com/platform/system/memory/lmkd/+/master/lmkd.cpp) — confirms kill decisions use RSS, not PSS
- [Detecting Android memory leaks in production (Lyft Engineering)](https://eng.lyft.com/detecting-android-memory-leaks-in-production-29e9c97e2ba1) — cost of `Debug.getMemoryInfo()` / `Debug.getPss()`

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
