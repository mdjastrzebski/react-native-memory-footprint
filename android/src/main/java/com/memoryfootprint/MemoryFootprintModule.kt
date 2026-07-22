package com.memoryfootprint

import android.os.Debug
import com.facebook.react.bridge.ReactApplicationContext

class MemoryFootprintModule(reactContext: ReactApplicationContext) :
  NativeMemoryFootprintSpec(reactContext) {

  override fun getMemoryFootprint(): Double {
    val memoryInfo = Debug.MemoryInfo()
    Debug.getMemoryInfo(memoryInfo)
    // getTotalPss() is reported in kB; convert to bytes.
    return (memoryInfo.totalPss.toLong() * 1024L).toDouble()
  }

  companion object {
    const val NAME = NativeMemoryFootprintSpec.NAME
  }
}
