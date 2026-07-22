import MemoryFootprint from './NativeMemoryFootprint';

/**
 * Returns the current memory footprint of the app process, in bytes.
 *
 * - iOS: `phys_footprint` from `TASK_VM_INFO`.
 * - Android: anonymous RSS + swap (`RssAnon` + `VmSwap`).
 */
export function getMemoryFootprint(): number {
  return MemoryFootprint.getMemoryFootprint();
}
