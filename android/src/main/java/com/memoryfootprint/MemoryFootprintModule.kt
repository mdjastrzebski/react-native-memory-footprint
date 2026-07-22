package com.memoryfootprint

import com.facebook.react.bridge.ReactApplicationContext

class MemoryFootprintModule(reactContext: ReactApplicationContext) :
  NativeMemoryFootprintSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeMemoryFootprintSpec.NAME
  }
}
