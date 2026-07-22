import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Returns the current memory footprint of the app process, in bytes.
   *
   * - iOS: `phys_footprint` from `TASK_VM_INFO` (the value Xcode's memory
   *   gauge and Jetsam use).
   * - Android: total PSS (proportional set size) of the process.
   */
  getMemoryFootprint(): number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MemoryFootprint');
