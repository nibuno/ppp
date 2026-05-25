type PdfLoaderProps = {
  durationMinutes: number
  talkNotesMarkdown: string
  onPdfFileChange: (file: File | null) => void
  onDurationMinutesChange: (minutes: number) => void
  onTalkNotesMarkdownChange: (markdown: string) => void
  onStart: () => void
}

export function PdfLoader({
  durationMinutes,
  talkNotesMarkdown,
  onPdfFileChange,
  onDurationMinutesChange,
  onTalkNotesMarkdownChange,
  onStart,
}: PdfLoaderProps) {
  return (
    <section className="loader-card">
      <div>
        <p className="eyebrow">PDF Presenter Pacemaker</p>
        <h1>発表の時間配分を見ながらPDFを進める</h1>
        <p className="intro">
          PDF、持ち時間、ページごとのトークメモを読み込んで、発表中のペースを確認できます。
        </p>
      </div>

      <label className="field">
        <span>PDFファイル</span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            onPdfFileChange(event.target.files?.[0] ?? null)
          }}
        />
      </label>

      <label className="field">
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

      <label className="field">
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

      <button className="primary-button" type="button" onClick={onStart}>
        開始
      </button>
    </section>
  )
}
