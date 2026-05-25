import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

type PdfCanvasProps = {
  document: PDFDocumentProxy
  currentPage: number
}

export function PdfCanvas({ document, currentPage }: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const renderPage = async () => {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      setError(null)

      try {
        renderTaskRef.current?.cancel()
        const page = await document.getPage(currentPage)
        if (cancelled) {
          return
        }

        const containerWidth = canvas.parentElement?.clientWidth ?? 960
        const unscaledViewport = page.getViewport({ scale: 1 })
        const scale = Math.min(containerWidth / unscaledViewport.width, 1.8)
        const viewport = page.getViewport({ scale })
        const context = canvas.getContext('2d')

        if (!context) {
          throw new Error('Canvasを初期化できませんでした。')
        }

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        const renderTask = page.render({ canvasContext: context, viewport })
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          setError(error instanceof Error ? error.message : 'PDFページの描画に失敗しました。')
        }
      }
    }

    void renderPage()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [currentPage, document])

  return (
    <div className="pdf-canvas-wrap">
      <canvas ref={canvasRef} className="pdf-canvas" />
      {error && <p className="error-message">{error}</p>}
    </div>
  )
}
