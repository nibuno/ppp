import { useEffect } from 'react'
import { PdfCanvas } from '../components/PdfCanvas'
import { usePresentationSession } from '../state/PresentationSession'

export function AudiencePage() {
  const session = usePresentationSession()

  useEffect(() => {
    document.title = '投影画面 — PDF Presenter Pacemaker'
  }, [])

  if (!session.isDesktop) {
    return (
      <main className="audience-message">
        <p>投影画面はTauriデスクトップ版で利用できます。</p>
      </main>
    )
  }

  if (!session.pdfDocument) {
    return (
      <main className="audience-message" aria-live="polite">
        <p>投影するPDFを準備しています…</p>
        {session.operationError && <p role="alert">{session.operationError}</p>}
      </main>
    )
  }

  return (
    <main className="audience-screen" aria-label="投影中のスライド">
      <PdfCanvas
        document={session.pdfDocument}
        currentPage={session.currentPage}
      />
    </main>
  )
}
