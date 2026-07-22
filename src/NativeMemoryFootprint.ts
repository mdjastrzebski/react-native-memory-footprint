import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Returns the current memory footprint of the app process, in bytes.
   *
   * - iOS: `phys_footprint` from `TASK_VM_INFO` (the value Xcode's memory
   *   gauge and Jetsam use).
   * - Android: anonymous RSS + swap (`RssAnon` + `VmSwap` from
   *   `/proc/self/status`) — the same metric Play Console's "excessive
   *   memory usage" vitals use.
   */
  getMemoryFootprint(): number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MemoryFootprint');
