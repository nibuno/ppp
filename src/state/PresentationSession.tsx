import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { describeDesktopError, getPresentationPdf } from '../desktop/presentation'
import { useDesktopPresentation } from '../hooks/useDesktopPresentation'
import { usePdfDocument } from '../hooks/usePdfDocument'
import type { TalkNotesByPage, TimerStatus } from '../types'
import { parseTalkNotes } from '../utils/parseTalkNotes'

const sampleTalkNotes = `# 1

今日は、PDFスライド発表用のビューアについて話します。

# 2

通常のPDFビューアでは、発表時間や話す内容を同時に確認しにくいです。

# 3

そこで、時間進捗とスライド進捗をうさぎとかめのように表示します。`

type PresentationSessionValue = {
  pdfFile: File | null
  pdfDocument: PDFDocumentProxy | null
  pdfIsLoading: boolean
  pdfError: string | null
  durationMinutes: number
  talkNotesMarkdown: string
  talkNotesByPage: TalkNotesByPage
  currentPage: number
  totalPages: number
  elapsedSeconds: number
  remainingSeconds: number
  durationSeconds: number
  timerStatus: TimerStatus
  isPreparing: boolean
  isRestoring: boolean
  operationError: string | null
  setPdfFile: (file: File | null) => void
  setDurationMinutes: (minutes: number) => void
  setTalkNotesMarkdown: (markdown: string) => void
  prepareAndStart: () => Promise<void>
  goToPage: (page: number) => void
  goNext: () => void
  goPrevious: () => void
  goFirst: () => void
  goLast: () => void
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  toggleTimer: () => void
  openAudience: () => void
  returnToSetup: () => Promise<void>
}

const PresentationSessionContext = createContext<PresentationSessionValue | null>(null)

export function PresentationSessionProvider({ children }: { children: ReactNode }) {
  const [pdfFile, setPdfFileState] = useState<File | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(10)
  const [talkNotesMarkdown, setTalkNotesMarkdown] = useState(sampleTalkNotes)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)
  const restoreRevisionRef = useRef<number | null>(null)

  const { document: pdfDocument, isLoading: pdfIsLoading, error: pdfError } =
    usePdfDocument(pdfFile)
  const durationSeconds = durationMinutes * 60
  const desktop = useDesktopPresentation()
  const talkNotesByPage = useMemo(
    () => parseTalkNotes(talkNotesMarkdown),
    [talkNotesMarkdown],
  )

  const totalPages = pdfDocument?.numPages ?? desktop.snapshot.totalPages
  const currentPage = desktop.snapshot.currentPage
  const elapsedSeconds = desktop.snapshot.elapsedSeconds
  const remainingSeconds = desktop.snapshot.remainingSeconds
  const timerStatus = desktop.snapshot.timerStatus

  useEffect(() => {
    if (
      !desktop.snapshot.hasPdf ||
      pdfFile ||
      restoreRevisionRef.current === desktop.snapshot.revision
    ) {
      return
    }

    restoreRevisionRef.current = desktop.snapshot.revision
    setIsRestoring(true)

    void getPresentationPdf()
      .then((pdfData) => {
        const restoredFile = new File(
          [pdfData],
          desktop.snapshot.fileName ?? 'presentation.pdf',
          { type: 'application/pdf' },
        )
        setPdfFileState(restoredFile)
        setDurationMinutes(Math.max(1, desktop.snapshot.durationSeconds / 60))
      })
      .catch((error) => {
        setOperationError(describeDesktopError(error))
      })
      .finally(() => {
        setIsRestoring(false)
      })
  }, [
    desktop.snapshot.durationSeconds,
    desktop.snapshot.fileName,
    desktop.snapshot.hasPdf,
    desktop.snapshot.revision,
    pdfFile,
  ])

  const setPdfFile = useCallback((file: File | null) => {
    setOperationError(null)
    setPdfFileState(file)
  }, [])

  const prepareAndStart = useCallback(async () => {
    if (!pdfFile || !pdfDocument) {
      throw new Error('PDFの読み込みが完了していません。')
    }

    setIsPreparing(true)
    setOperationError(null)

    try {
      await desktop.prepare(pdfFile, pdfDocument.numPages, durationSeconds)
      await desktop.start()
    } catch (error) {
      const message = describeDesktopError(error)
      setOperationError(message)
      throw new Error(message)
    } finally {
      setIsPreparing(false)
    }
  }, [desktop, durationSeconds, pdfDocument, pdfFile])

  const runDesktopAction = useCallback((action: () => Promise<unknown>) => {
    setOperationError(null)
    void action().catch((error) => {
      setOperationError(describeDesktopError(error))
    })
  }, [])

  const goToPage = useCallback(
    (page: number) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages || 1)
      runDesktopAction(() => desktop.goToPage(nextPage))
    },
    [desktop, runDesktopAction, totalPages],
  )

  const goNext = useCallback(
    () => goToPage(currentPage + 1),
    [currentPage, goToPage],
  )
  const goPrevious = useCallback(
    () => goToPage(currentPage - 1),
    [currentPage, goToPage],
  )
  const goFirst = useCallback(() => goToPage(1), [goToPage])
  const goLast = useCallback(
    () => goToPage(totalPages || 1),
    [goToPage, totalPages],
  )

  const startTimer = useCallback(() => {
    runDesktopAction(desktop.start)
  }, [desktop, runDesktopAction])

  const pauseTimer = useCallback(() => {
    runDesktopAction(desktop.pause)
  }, [desktop, runDesktopAction])

  const resetTimer = useCallback(() => {
    runDesktopAction(desktop.reset)
  }, [desktop, runDesktopAction])

  const toggleTimer = useCallback(() => {
    if (timerStatus === 'running') {
      pauseTimer()
    } else {
      startTimer()
    }
  }, [pauseTimer, startTimer, timerStatus])

  const openAudience = useCallback(() => {
    runDesktopAction(desktop.openAudience)
  }, [desktop, runDesktopAction])

  const returnToSetup = useCallback(async () => {
    setOperationError(null)

    try {
      if (timerStatus === 'running') {
        await desktop.pause()
      }
      await desktop.closeAudience()
    } catch (error) {
      const message = describeDesktopError(error)
      setOperationError(message)
      throw new Error(message)
    }
  }, [desktop, timerStatus])

  const value: PresentationSessionValue = {
    pdfFile,
    pdfDocument,
    pdfIsLoading,
    pdfError,
    durationMinutes,
    talkNotesMarkdown,
    talkNotesByPage,
    currentPage,
    totalPages,
    elapsedSeconds,
    remainingSeconds,
    durationSeconds: desktop.snapshot.totalPages > 0
      ? desktop.snapshot.durationSeconds
      : durationSeconds,
    timerStatus,
    isPreparing,
    isRestoring,
    operationError,
    setPdfFile,
    setDurationMinutes,
    setTalkNotesMarkdown,
    prepareAndStart,
    goToPage,
    goNext,
    goPrevious,
    goFirst,
    goLast,
    startTimer,
    pauseTimer,
    resetTimer,
    toggleTimer,
    openAudience,
    returnToSetup,
  }

  return (
    <PresentationSessionContext.Provider value={value}>
      {children}
    </PresentationSessionContext.Provider>
  )
}

// The provider and its hook intentionally share this module so the context type stays private.
// eslint-disable-next-line react-refresh/only-export-components
export function usePresentationSession(): PresentationSessionValue {
  const value = useContext(PresentationSessionContext)
  if (!value) {
    throw new Error('PresentationSessionProviderが必要です。')
  }
  return value
}
