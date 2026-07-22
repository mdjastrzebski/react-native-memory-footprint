package com.memoryfootprint

import com.facebook.react.bridge.ReactApplicationContext
import java.io.File

class MemoryFootprintModule(reactContext: ReactApplicationContext) :
  NativeMemoryFootprintSpec(reactContext) {

  override fun getMemoryFootprint(): Double {
    var rssAnonKb = 0L
    var vmSwapKb = 0L

    File("/proc/self/status").forEachLine { line ->
      when {
        line.startsWith("RssAnon:") -> rssAnonKb = parseKbValue(line)
        line.startsWith("VmSwap:") -> vmSwapKb = parseKbValue(line)
      }
    }

    return ((rssAnonKb + vmSwapKb) * 1024L).toDouble()
  }

  private fun parseKbValue(line: String): Long {
    // Lines look like "RssAnon:\t   12345 kB"; take the numeric field.
    return line.substringAfter(':').trim().removeSuffix("kB").trim().toLong()
  }

  companion object {
    const val NAME = NativeMemoryFootprintSpec.NAME
  }
}
