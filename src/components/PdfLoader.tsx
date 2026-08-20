import { useRef, useState, type DragEvent } from 'react'

type PdfLoaderProps = {
  durationMinutes: number
  talkNotesMarkdown: string
  onPdfFileChange: (file: File | null) => void
  onDurationMinutesChange: (minutes: number) => void
  onTalkNotesMarkdownChange: (markdown: string) => void
  onStart: () => void
  canStart?: boolean
  isStarting?: boolean
  selectedFileName?: string | null
}

export function PdfLoader({
  durationMinutes,
  talkNotesMarkdown,
  onPdfFileChange,
  onDurationMinutesChange,
  onTalkNotesMarkdownChange,
  onStart,
  canStart = true,
  isStarting = false,
  selectedFileName = null,
}: PdfLoaderProps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [dropError, setDropError] = useState('')
  const dragDepth = useRef(0)

  const isPdfFile = (file: File) =>
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current += 1
    setIsDraggingFile(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current -= 1

    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDraggingFile(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setIsDraggingFile(false)

    const file = event.dataTransfer.files[0]
    if (!file) {
      return
    }

    if (!isPdfFile(file)) {
      setDropError('PDFファイルをドロップしてください。')
      return
    }

    setDropError('')
    onPdfFileChange(file)
  }

  return (
    <section
      className={`setup-workspace drop-zone${isDraggingFile ? ' is-dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="setup-header">
        <div>
          <p className="eyebrow">PDF Presenter Pacemaker</p>
          <h1>発表準備</h1>
        </div>
        <p className="intro">
          スライド、持ち時間、ページごとのトークメモを設定します。
        </p>
      </header>

      <div className="setup-columns">
        <section className="setup-section slide-source-section">
          <div className="section-heading">
            <p className="section-number">01</p>
            <div>
              <h2>スライド</h2>
              <p>現在の対応形式: PDF</p>
            </div>
          </div>

          <label className="file-picker">
            <input
              className="visually-hidden-file-input"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setDropError('')
                onPdfFileChange(file)
              }}
            />
            <strong aria-live="polite">
              {selectedFileName ?? 'PDFファイルを選択'}
            </strong>
            <span className="drop-zone-hint">
              {isDraggingFile
                ? 'ここにドロップ'
                : 'クリックして選択、またはここへドラッグ＆ドロップ'}
            </span>
          </label>
          {dropError && (
            <p className="drop-zone-error" role="alert">
              {dropError}
            </p>
          )}
        </section>

        <section className="setup-section presentation-settings-section">
          <div className="section-heading">
            <p className="section-number">02</p>
            <div>
              <h2>発表設定</h2>
              <p>時間と、発表者だけに表示するメモ</p>
            </div>
          </div>

          <label className="field duration-field">
            <span>発表時間</span>
            <div className="duration-input">
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(event) => {
                  onDurationMinutesChange(Math.max(1, Number(event.target.value) || 1))
                }}
              />
              <span>分</span>
            </div>
          </label>

          <label className="field notes-field">
            <span>トークメモ Markdown</span>
            <textarea
              value={talkNotesMarkdown}
              rows={10}
              placeholder={'# 1\n\n導入で話す内容\n\n# 2\n\n次ページのメモ'}
              onChange={(event) => {
                onTalkNotesMarkdownChange(event.target.value)
              }}
            />
          </label>
        </section>
      </div>

      <footer className="setup-footer">
        <p>開始後も設定を保持したまま、この画面へ戻れます。</p>
        <button
          className="primary-button"
          type="button"
          onClick={onStart}
          disabled={!canStart || isStarting}
        >
          {isStarting ? '発表を準備中…' : '発表を開始'}
        </button>
      </footer>
    </section>
  )
}
