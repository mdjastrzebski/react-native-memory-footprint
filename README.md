# react-native-memory-footprint

A tiny React Native library for reading how much memory your app is really using, on iOS and Android.

This library reports each platform's own definition of "real" usage:

- **iOS**: `phys_footprint`, the same number shown in Xcode's memory gauge, and what [Jetsam](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports) uses to decide whether to kill your app
- **Android**: anonymous RSS + swap, the same metric Google's own Play Vitals uses to flag apps for excessive memory usage

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
| iOS | `phys_footprint` from `task_info(TASK_VM_INFO)`, the same value shown in Xcode's memory gauge and used by [Jetsam](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports) |
| Android | Anonymous RSS + swap (`RssAnon` + `VmSwap` from `/proc/self/status`), the same metric behind Play Console's "excessive memory usage" vitals |

## How iOS memory footprint is calculated

Per [WWDC 2018 Session 416, "iOS Memory Deep Dive"](https://devstreaming-cdn.apple.com/videos/wwdc/2018/416n2fmzz0fz88f/416/416_ios_memory_deep_dive.pdf), Apple's own mental model for `phys_footprint` is:

> App memory = Dirty + Compressed. Clean memory is not considered being used.

Only memory your app has actually written to (dirty), plus memory the compressor has squeezed out of residency (compressed), counts. Clean, read-only, or shared memory (like code pages loaded from system libraries) doesn't, no matter how much RAM it occupies. The exact formula, from the XNU kernel source ([`osfmk/kern/task.c`](https://github.com/apple/darwin-xnu/blob/main/osfmk/kern/task.c)):

```
phys_footprint = (internal - alternate_accounting)
                + (internal_compressed - alternate_accounting_compressed)
                + iokit_mapped
                + purgeable_nonvolatile
                + purgeable_nonvolatile_compressed
                + page_table
```

**Why this metric:** it's the same number Xcode's memory gauge shows, and the one [Jetsam](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports) actually uses to decide whether to kill your app, so it's the most actionable measure of your app's real memory risk.

### Further reading

- [darwin-xnu `task.c`](https://github.com/apple/darwin-xnu/blob/main/osfmk/kern/task.c): the actual ledger field definitions (`internal`, `internal_compressed`, `alternate_accounting`, `iokit_mapped`, `purgeable_nonvolatile`)
- [WWDC 2018 Session 416, "iOS Memory Deep Dive"](https://devstreaming-cdn.apple.com/videos/wwdc/2018/416n2fmzz0fz88f/416/416_ios_memory_deep_dive.pdf) (slides) and [session notes](https://gist.github.com/SheldonWangRJT/5d2ea69f78a905c76e0c36dfc994e85c)
- [Identifying high-memory use with jetsam event reports (Apple Developer Documentation)](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports): what Jetsam is and how it decides to terminate apps
- [Apple Developer Forums: `phys_footprint` and IOKit accounting](https://developer.apple.com/forums/thread/111551)

## How Android memory footprint is calculated

Android has no single official "memory footprint" metric; the term covers three different measurements. Per the [Android memory management guide](https://developer.android.com/topic/performance/memory-management):

> - **Resident Set Size (RSS)**: The number of shared and non-shared pages used by the app
> - **Proportional Set Size (PSS)**: The number of non-shared pages used by the app and an even distribution of the shared pages (for example, if three processes are sharing 3MB, each process gets 1MB in PSS)
> - **Unique Set Size (USS)**: The number of non-shared pages used by the app (shared pages are not included)

`getMemoryFootprint()` reports **anonymous RSS + swap**: resident anonymous memory (heap, native allocations, thread stacks) plus anonymous memory currently swapped out. It's read directly from `RssAnon` + `VmSwap` in `/proc/self/status`, a single cheap file read with no special permissions needed.

**Why this metric:** it's the same one behind Play Console's "excessive memory usage" vitals warning, per the [Play Vitals memory usage doc](https://developer.android.com/topic/performance/vitals/memory-usage):

> Tracking anonymous RSS + swap ensures you see your app's true, unevictable memory footprint.

It's also a better match for actual kill risk than PSS. PSS's proportional-sharing math exists for system-wide RAM bookkeeping, not for judging whether your app individually is heavy, and Android's low-memory killer daemon doesn't use PSS either: per the [AOSP `lmkd` source](https://android.googlesource.com/platform/system/memory/lmkd/+/master/lmkd.cpp), it picks a victim by reading plain RSS from `/proc/pid/statm`. Anonymous RSS + swap sits close to that, while also mirroring iOS's "dirty + compressed" model.

### Further reading

- [Android memory management guide](https://developer.android.com/topic/performance/memory-management): RSS vs. PSS vs. USS
- [Memory usage (anonymous RSS + swap), Play Vitals](https://developer.android.com/topic/performance/vitals/memory-usage): official definition of the metric this library reports
- [`proc_pid_status(5)` man page](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html): `RssAnon` / `VmSwap` field definitions
- [AOSP `lmkd` source, `proc_get_size()`](https://android.googlesource.com/platform/system/memory/lmkd/+/master/lmkd.cpp): confirms kill decisions use RSS, not PSS
- [Detecting Android memory leaks in production (Lyft Engineering)](https://eng.lyft.com/detecting-android-memory-leaks-in-production-29e9c97e2ba1): cost of `Debug.getMemoryInfo()` / `Debug.getPss()`

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
