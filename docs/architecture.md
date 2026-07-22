# Architecture

## What the module measures

Each platform reports its own definition of "real" memory usage:

- **iOS**: `phys_footprint` from `task_info(TASK_VM_INFO)` — the value in Xcode's memory gauge and what Jetsam uses to kill apps.
- **Android**: anonymous RSS + swap (`RssAnon` + `VmSwap` from `/proc/self/status`) — the metric behind Play Vitals' "excessive memory usage" warning.

The README's "How ... memory footprint is calculated" sections are the authoritative rationale for these metric choices; update them if the native implementations change what they measure.

## Repo layout

Monorepo via Yarn workspaces. Library package at the root; example Expo app in `example/`.

- `src/NativeMemoryFootprint.ts` — the TurboModule spec (`Spec extends TurboModule`). This is the codegen source of truth; the native `NativeMemoryFootprintSpec` base classes are generated from it.
- `src/index.tsx` — public JS API, thin wrapper over the native module.
- `ios/MemoryFootprint.mm` / `.h` — Objective-C++ implementation.
- `android/src/main/java/com/memoryfootprint/` — `MemoryFootprintModule.kt` (implementation) and `MemoryFootprintPackage.kt` (registration).
- `example/` — Expo app used to exercise changes; runs against the local library source.

## The three-layer sync rule

The three layers (spec, iOS, Android) must stay in sync. Changing the JS signature in `NativeMemoryFootprint.ts` requires matching changes in both native files and a rebuild of the example app.
