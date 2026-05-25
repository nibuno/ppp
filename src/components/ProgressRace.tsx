import { clamp } from '../utils/clamp'

type ProgressRaceProps = {
  timeProgress: number
  slideProgress: number
}

export function ProgressRace({ timeProgress, slideProgress }: ProgressRaceProps) {
  const timePercent = clamp(timeProgress, 0, 1) * 100
  const slidePercent = clamp(slideProgress, 0, 1) * 100
  const gap = timeProgress - slideProgress
  const message =
    Math.abs(gap) < 0.06
      ? '予定通り'
      : gap > 0
        ? 'スライド進行が遅れ気味'
        : 'スライド進行が速め'

  return (
    <div className="race" aria-label="時間進捗とスライド進捗">
      <div className="race-labels">
        <span>開始</span>
        <strong>{message}</strong>
        <span>終了</span>
      </div>
      <div className="race-track">
        <span className="race-icon rabbit" style={{ left: `${timePercent}%` }}>
          🐇
        </span>
        <span className="race-icon turtle" style={{ left: `${slidePercent}%` }}>
          🐢
        </span>
      </div>
    </div>
  )
}
