import { Link } from '@tanstack/react-router'

export function RehearsalsPage() {
  return (
    <main className="app-root route-message">
      <h1>リハーサル履歴</h1>
      <p>このプロトタイプでは、履歴の保存はまだ実装していません。</p>
      <Link to="/setup">発表準備へ戻る</Link>
    </main>
  )
}
