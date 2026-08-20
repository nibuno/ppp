import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { PdfCanvas } from '../components/PdfCanvas'
import { PresenterLayout } from '../components/PresenterLayout'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { usePresentationSession } from '../state/PresentationSession'

export function PresenterPage() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const session = usePresentationSession()
  const navigate = useNavigate()

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!rootRef.current) {
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void rootRef.current.requestFullscreen()
    }
  }, [])

  useKeyboardNavigation({
    enabled: Boolean(session.pdfDocument),
    onNext: session.goNext,
    onPrevious: session.goPrevious,
    onFirst: session.goFirst,
    onLast: session.goLast,
    onToggleFullscreen: toggleFullscreen,
    onResetTimer: session.resetTimer,
    onToggleTimer: session.toggleTimer,
  })

  const returnToSetup = useCallback(async () => {
    await session.returnToSetup()
    await navigate({ to: '/setup' })
  }, [navigate, session])

  if (!session.pdfDocument) {
    return (
      <main className="app-root route-message">
        <h1>発表データがありません</h1>
        <p>PDFを選択してから発表を開始してください。</p>
        <Link to="/setup">発表準備へ戻る</Link>
      </main>
    )
  }

  return (
    <div className="app-root" ref={rootRef}>
      <PresenterLayout
        currentPage={session.currentPage}
        totalPages={session.totalPages}
        elapsedSeconds={session.elapsedSeconds}
        remainingSeconds={session.remainingSeconds}
        durationSeconds={session.durationSeconds}
        timerStatus={session.timerStatus}
        currentNote={session.talkNotesByPage[session.currentPage] ?? ''}
        isFullscreen={isFullscreen}
        onPrevious={session.goPrevious}
        onNext={session.goNext}
        onStartTimer={session.startTimer}
        onPauseTimer={session.pauseTimer}
        onResetTimer={session.resetTimer}
        onToggleFullscreen={toggleFullscreen}
        canOpenAudience={session.isDesktop}
        onOpenAudience={session.openAudience}
        operationError={session.operationError}
        onReturnToSetup={() => void returnToSetup()}
      >
        <PdfCanvas
          document={session.pdfDocument}
          currentPage={session.currentPage}
        />
      </PresenterLayout>
    </div>
  )
}
