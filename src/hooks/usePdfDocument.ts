import { useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type PdfDocumentState = {
  document: PDFDocumentProxy | null
  isLoading: boolean
  error: string | null
}

export function usePdfDocument(file: File | null): PdfDocumentState {
  const [state, setState] = useState<PdfDocumentState>({
    document: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    if (!file) {
      setState({ document: null, isLoading: false, error: null })
      return
    }

    let cancelled = false
    const task = async () => {
      setState({ document: null, isLoading: true, error: null })

      try {
        const data = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data })
        const document = await loadingTask.promise

        if (!cancelled) {
          setState({ document, isLoading: false, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            document: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'PDFの読み込みに失敗しました。',
          })
        }
      }
    }

    void task()

    return () => {
      cancelled = true
    }
  }, [file])

  return state
}
