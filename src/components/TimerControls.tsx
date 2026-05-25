import type { TimerStatus } from '../types'
import { formatTime } from '../utils/formatTime'

type TimerControlsProps = {
  elapsedSeconds: number
  remainingSeconds: number
  status: TimerStatus
  isFullscreen: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onToggleFullscreen: () => void
}

export function TimerControls({
  elapsedSeconds,
  remainingSeconds,
  status,
  isFullscreen,
  onStart,
  onPause,
  onReset,
  onToggleFullscreen,
}: TimerControlsProps) {
  const remainingLabel =
    remainingSeconds < 0 ? `超過 ${formatTime(remainingSeconds)}` : `残り ${formatTime(remainingSeconds)}`

  return (
    <div className="timer-controls">
      <div className="timer-readout">
        <span>経過 {formatTime(elapsedSeconds)}</span>
        <span className={remainingSeconds < 0 ? 'over-time' : ''}>{remainingLabel}</span>
      </div>
      <div className="control-buttons">
        {status === 'running' ? (
          <button type="button" onClick={onPause}>
            一時停止
          </button>
        ) : (
          <button type="button" onClick={onStart}>
            開始
          </button>
        )}
        <button type="button" onClick={onReset}>
          リセット
        </button>
        <button type="button" onClick={onToggleFullscreen}>
          {isFullscreen ? '解除' : 'フルスクリーン'}
        </button>
      </div>
    </div>
  )
}
