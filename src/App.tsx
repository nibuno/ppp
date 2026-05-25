import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PdfLoader } from './components/PdfLoader'
import { PdfCanvas } from './components/PdfCanvas'
import { PresenterLayout } from './components/PresenterLayout'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'
import { usePdfDocument } from './hooks/usePdfDocument'
import { usePresentationTimer } from './hooks/usePresentationTimer'
import { parseTalkNotes } from './utils/parseTalkNotes'

const sampleTalkNotes = `# 1

今日は、PDFスライド発表用のビューアについて話します。

# 2

通常のPDFビューアでは、発表時間や話す内容を同時に確認しにくいです。

# 3

そこで、時間進捗とスライド進捗をうさぎとかめのように表示します。`

export default function App() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [durationMinutes, setDurationMinutes] = useState(10)
  const [talkNotesMarkdown, setTalkNotesMarkdown] = useState(sampleTalkNotes)
  const [hasStartedPresentation, setHasStartedPresentation] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { document: pdfDocument, isLoading, error } = usePdfDocument(pdfFile)
  const durationSeconds = durationMinutes * 60
  const timer = usePresentationTimer(durationSeconds)
  const talkNotesByPage = useMemo(() => parseTalkNotes(talkNotesMarkdown), [talkNotesMarkdown])
  const totalPages = pdfDocument?.numPages ?? 0

  useEffect(() => {
    setCurrentPage(1)
  }, [pdfDocument])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const goNext = useCallback(() => {
    setCurrentPage((page) => Math.min(page + 1, totalPages || 1))
  }, [totalPages])

  const goPrevious = useCallback(() => {
    setCurrentPage((page) => Math.max(page - 1, 1))
  }, [])

  const goFirst = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const goLast = useCallback(() => {
    setCurrentPage(totalPages || 1)
  }, [totalPages])

  const toggleFullscreen = useCallback(() => {
    if (!rootRef.current) {
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    void rootRef.current.requestFullscreen()
  }, [])

  useKeyboardNavigation({
    enabled: Boolean(pdfDocument),
    onNext: goNext,
    onPrevious: goPrevious,
    onFirst: goFirst,
    onLast: goLast,
    onToggleFullscreen: toggleFullscreen,
    onResetTimer: timer.reset,
    onToggleTimer: timer.toggle,
  })

  const canEnterPresentation = Boolean(pdfDocument)

  return (
    <div className="app-root" ref={rootRef}>
      {!hasStartedPresentation || !pdfDocument ? (
        <div className="setup-screen">
          <PdfLoader
            durationMinutes={durationMinutes}
            talkNotesMarkdown={talkNotesMarkdown}
            onPdfFileChange={setPdfFile}
            onDurationMinutesChange={setDurationMinutes}
            onTalkNotesMarkdownChange={setTalkNotesMarkdown}
            onStart={() => {
              if (canEnterPresentation) {
                setHasStartedPresentation(true)
                timer.start()
              }
            }}
          />
          <div className="setup-status">
            {isLoading && <p>PDFを読み込んでいます...</p>}
            {error && <p className="error-message">{error}</p>}
            {!pdfFile && <p>PDFを選択すると開始できます。</p>}
            {pdfFile && !pdfDocument && !isLoading && !error && <p>PDFを待機中です。</p>}
            {pdfDocument && (
              <p>
                読み込み完了: {pdfFile?.name} / {pdfDocument.numPages}ページ
              </p>
            )}
          </div>
        </div>
      ) : (
        <PresenterLayout
          currentPage={currentPage}
          totalPages={totalPages}
          elapsedSeconds={timer.elapsedSeconds}
          remainingSeconds={timer.remainingSeconds}
          durationSeconds={durationSeconds}
          timerStatus={timer.status}
          currentNote={talkNotesByPage[currentPage] ?? ''}
          isFullscreen={isFullscreen}
          onPrevious={goPrevious}
          onNext={goNext}
          onStartTimer={timer.start}
          onPauseTimer={timer.pause}
          onResetTimer={timer.reset}
          onToggleFullscreen={toggleFullscreen}
        >
          <PdfCanvas document={pdfDocument} currentPage={currentPage} />
        </PresenterLayout>
      )}
    </div>
  )
}
