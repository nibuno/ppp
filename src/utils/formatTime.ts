export function formatTime(totalSeconds: number): string {
  const absSeconds = Math.abs(Math.floor(totalSeconds))
  const minutes = Math.floor(absSeconds / 60)
  const seconds = absSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
