export function RouteError({ error }: { error: Error }) {
  return (
    <main className="app-root route-message">
      <h1>画面を表示できませんでした</h1>
      <p>{error.message}</p>
      <button type="button" onClick={() => window.location.reload()}>
        再読み込み
      </button>
    </main>
  )
}

export function NotFound() {
  return (
    <main className="app-root route-message">
      <h1>画面が見つかりません</h1>
      <a href="#/setup">発表準備を開く</a>
    </main>
  )
}
