import { useEffect, useState } from 'react'
import type { TimerStatus } from '../types'

type PresentationTimer = {
  elapsedSeconds: number
  remainingSeconds: number
  status: TimerStatus
  start: () => void
  pause: () => void
  reset: () => void
  toggle: () => void
}

export function usePresentationTimer(durationSeconds: number): PresentationTimer {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [pausedElapsedSeconds, setPausedElapsedSeconds] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const status: TimerStatus =
    startedAt == null ? (pausedElapsedSeconds > 0 ? 'paused' : 'idle') : 'running'

  const elapsedSeconds =
    startedAt == null
      ? pausedElapsedSeconds
      : pausedElapsedSeconds + Math.floor((now - startedAt) / 1000)

  useEffect(() => {
    if (startedAt == null) {
      return
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [startedAt])

  const start = () => {
    if (startedAt != null) {
      return
    }

    setStartedAt(Date.now())
    setNow(Date.now())
  }

  const pause = () => {
    if (startedAt == null) {
      return
    }

    setPausedElapsedSeconds(
      pausedElapsedSeconds + Math.floor((Date.now() - startedAt) / 1000),
    )
    setStartedAt(null)
  }

  const reset = () => {
    setStartedAt(null)
    setPausedElapsedSeconds(0)
    setNow(Date.now())
  }

  const toggle = () => {
    if (startedAt == null) {
      start()
      return
    }

    pause()
  }

  return {
    elapsedSeconds,
    remainingSeconds: durationSeconds - elapsedSeconds,
    status,
    start,
    pause,
    reset,
    toggle,
  }
}
