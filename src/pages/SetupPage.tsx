import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PdfLoader } from '../components/PdfLoader'
import { usePresentationSession } from '../state/PresentationSession'

export function SetupPage() {
  const navigate = useNavigate()
  const session = usePresentationSession()
  const [startError, setStartError] = useState<string | null>(null)

  const handleStart = async () => {
    setStartError(null)
    try {
      await session.prepareAndStart()
      await navigate({ to: '/presenter' })
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : '発表を開始できませんでした。',
      )
    }
  }

  return (
    <main className="app-root setup-screen">
      <PdfLoader
        durationMinutes={session.durationMinutes}
        talkNotesMarkdown={session.talkNotesMarkdown}
        onPdfFileChange={session.setPdfFile}
        onDurationMinutesChange={session.setDurationMinutes}
        onTalkNotesMarkdownChange={session.setTalkNotesMarkdown}
        onStart={() => void handleStart()}
        canStart={Boolean(session.pdfDocument)}
        isStarting={session.isPreparing}
        selectedFileName={session.pdfFile?.name}
      />

      <div className="setup-status" aria-live="polite">
        <p>発表開始後に、スライドだけの投影画面を別ウインドウで開けます。</p>
        {(session.pdfIsLoading || session.isRestoring) && (
          <p>PDFを読み込んでいます…</p>
        )}
        {session.pdfError && <p className="error-message">{session.pdfError}</p>}
        {(startError || session.operationError) && (
          <p className="error-message" role="alert">
            {startError ?? session.operationError}
          </p>
        )}
        {!session.pdfFile && !session.isRestoring && (
          <p>PDFを選択すると開始できます。</p>
        )}
        {session.pdfFile &&
          !session.pdfDocument &&
          !session.pdfIsLoading &&
          !session.pdfError && <p>PDFを待機中です。</p>}
        {session.pdfDocument && (
          <p>
            読み込み完了: {session.pdfFile?.name} / {session.pdfDocument.numPages}
            ページ
          </p>
        )}
      </div>
    </main>
  )
}
