import type { ReactNode } from 'react'
import { ProgressRace } from './ProgressRace'
import { TalkNotePanel } from './TalkNotePanel'
import { TimerControls } from './TimerControls'
import type { TimerStatus } from '../types'

type PresenterLayoutProps = {
  currentPage: number
  totalPages: number
  elapsedSeconds: number
  remainingSeconds: number
  durationSeconds: number
  timerStatus: TimerStatus
  currentNote: string
  isFullscreen: boolean
  onPrevious: () => void
  onNext: () => void
  onStartTimer: () => void
  onPauseTimer: () => void
  onResetTimer: () => void
  onToggleFullscreen: () => void
  children: ReactNode
}

export function PresenterLayout({
  currentPage,
  totalPages,
  elapsedSeconds,
  remainingSeconds,
  durationSeconds,
  timerStatus,
  currentNote,
  isFullscreen,
  onPrevious,
  onNext,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onToggleFullscreen,
  children,
}: PresenterLayoutProps) {
  const timeProgress = durationSeconds > 0 ? elapsedSeconds / durationSeconds : 0
  const slideProgress = totalPages <= 1 ? 1 : (currentPage - 1) / (totalPages - 1)
  const remainingRatio = durationSeconds > 0 ? remainingSeconds / durationSeconds : 1
  const timeTone =
    remainingSeconds < 0 ? 'is-over' : remainingRatio < 0.2 ? 'is-warning' : ''

  return (
    <section className={`presenter-shell ${timeTone}`}>
      <main className="slide-area">{children}</main>

      <aside className="side-panel">
        <div className="page-status">
          <span>Page</span>
          <strong>
            {currentPage} / {totalPages}
          </strong>
        </div>

        <TimerControls
          elapsedSeconds={elapsedSeconds}
          remainingSeconds={remainingSeconds}
          status={timerStatus}
          isFullscreen={isFullscreen}
          onStart={onStartTimer}
          onPause={onPauseTimer}
          onReset={onResetTimer}
          onToggleFullscreen={onToggleFullscreen}
        />

        <div className="page-buttons">
          <button type="button" onClick={onPrevious} disabled={currentPage <= 1}>
            前へ
          </button>
          <button type="button" onClick={onNext} disabled={currentPage >= totalPages}>
            次へ
          </button>
        </div>

        <ProgressRace timeProgress={timeProgress} slideProgress={slideProgress} />
      </aside>

      <TalkNotePanel currentPage={currentPage} note={currentNote} />
    </section>
  )
}
