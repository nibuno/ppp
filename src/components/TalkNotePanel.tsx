type TalkNotePanelProps = {
  currentPage: number
  note: string
}

export function TalkNotePanel({ currentPage, note }: TalkNotePanelProps) {
  return (
    <aside className="talk-note-panel">
      <p className="panel-label">トークメモ / Page {currentPage}</p>
      {note ? <pre>{note}</pre> : <p className="empty-note">メモなし</p>}
    </aside>
  )
}
