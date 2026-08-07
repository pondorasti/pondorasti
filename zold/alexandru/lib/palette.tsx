import { init, events, measure, network, profiler } from "@palette.dev/browser"
import React, { useEffect, useRef } from "react"

init({
  key: "clawueapo0003mg0863s1eak9",
  plugins: [events(), network(), measure(), profiler()],
})

// Profile page load
//   * Sample every 10ms
//   * Start the profiler immediately
//   * Measure page load
if (typeof window !== "undefined") {
  profiler.start({ sampleInterval: 10, maxBufferSize: 100_000 })
  addEventListener("load", () => {
    performance.measure("load")
    profiler.stop()
  })
}

// A utility for debouncing frequent events, making them easier to profile
let timeoutId: NodeJS.Timeout | undefined
const debounce = (start: () => void, stop: () => void) => {
  return () => {
    if (typeof timeoutId === "number") {
      clearTimeout(timeoutId)
    } else {
      start()
    }
    timeoutId = setTimeout(() => {
      stop()
      timeoutId = undefined
    }, 1_000)
  }
}

interface PaletteProviderProps {
  children: React.ReactElement[] | React.ReactElement
}

export const PaletteProvider: React.FC<PaletteProviderProps> = ({ children }) => {
  const debounceProfiler = useRef(
    debounce(
      () => {
        profiler.start({ sampleInterval: 10, maxBufferSize: 100_000 })
      },
      () => {
        profiler.stop()
      }
    )
  )

  // Profile page interactions
  //   * Collect samples every 10ms
  //   * Start the profiler on click, keypress, pointermove, and wheel events
  //   * Stop the profiler after 1s of inactivity
  useEffect(() => {
    addEventListener("click", debounceProfiler.current)
    addEventListener("keypress", debounceProfiler.current)
    addEventListener("pointermove", debounceProfiler.current)
    addEventListener("wheel", debounceProfiler.current)

    return () => {
      removeEventListener("click", debounceProfiler.current)
      removeEventListener("keypress", debounceProfiler.current)
      removeEventListener("pointermove", debounceProfiler.current)
      removeEventListener("wheel", debounceProfiler.current)
    }
  }, [])

  return <>{children}</>
}
