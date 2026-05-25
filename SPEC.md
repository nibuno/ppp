# PDF Presenter Pacemaker 実装引き継ぎ資料

## 目的

PDFスライドを使った発表向けに、発表者が時間配分と話す内容を確認しながら発表できるPDFビューアを作成する。

通常のPDFビューアでは、以下が不足している。

- 発表開始からの経過時間が見えない
- 持ち時間に対する進捗が分かりづらい
- スライド進捗と時間進捗のズレが分かりづらい
- ページごとのトークメモを見ながら話しにくい

本アプリでは、PDF表示に加えて、Rabbitの「うさぎとかめ」風の時間進捗表示と、ページごとのトークメモ表示を実装する。

---

## 作りたいもの

ブラウザで動くPDF発表ビューア。

想定する利用手順は以下。

1. ユーザーがPDFファイルを読み込む
2. 発表時間を入力する
3. 必要に応じて、ページごとのトークメモを読み込む
4. 発表開始ボタンを押す
5. PDFスライドを表示する
6. 矢印キーでページ送りする
7. 画面下部に、時間進捗とスライド進捗を表示する
8. 発表者画面には、現在ページのトークメモも表示する

---

## 技術方針

### フロントエンド

- Vite
- React
- TypeScript
- PDF.js
- CSS Modules または通常のCSS

### 主なブラウザAPI

- File API
- Fullscreen API
- Keyboard Event
- LocalStorage

---

## MVPで実装する機能

### 必須機能

- PDFファイルをアップロードできる
- PDFの現在ページを表示できる
- 前ページ / 次ページに移動できる
- キーボードでページ移動できる
  - `ArrowRight`, `Space`: 次ページ
  - `ArrowLeft`: 前ページ
- 総ページ数と現在ページを表示できる
- 発表時間を分単位で入力できる
- 発表開始 / 一時停止 / リセットができる
- 経過時間と残り時間を表示できる
- 時間進捗とスライド進捗をアイコンで表示できる
- ページごとのトークメモを表示できる
- フルスクリーン表示できる

### MVPではやらないこと

- PDFへの書き込み
- PDF内の発表者ノート抽出
- 複数ウィンドウの発表者画面 / 観客画面分離
- リハーサルログ保存
- クラウド保存
- ユーザー認証

---

## 画面構成

### 初期画面

PDF未読み込み時の画面。

```text
┌──────────────────────────────┐
│ PDF Presenter Pacemaker       │
├──────────────────────────────┤
│ PDFファイルを選択              │
│ [ file input ]                │
│                              │
│ 発表時間                      │
│ [ 10 ] 分                     │
│                              │
│ トークメモ                    │
│ [ textarea or file input ]    │
│                              │
│ [開始]                       │
└──────────────────────────────┘
```

### 発表画面

```text
┌──────────────────────────────────────┐
│                                      │
│              PDFスライド              │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  3 / 20   経過 04:32   残り 05:28     │
│  開始 ───── 🐢 ───── 🐇 ───── 終了     │
└──────────────────────────────────────┘
```

### 発表者モード案

MVPでは同一画面内にトークメモを出す。

```text
┌──────────────────────────┬──────────────┐
│                          │ 経過 04:32    │
│       PDFスライド         │ 残り 05:28    │
│                          │ 3 / 20        │
│                          │              │
├──────────────────────────┤ 🐢───🐇────  │
│ トークメモ                │              │
│ - このページでは...        │              │
│ - 次に...                  │              │
└──────────────────────────┴──────────────┘
```

---

## 時間進捗表示の考え方

Rabbitの「うさぎとかめ」風に、2つの進捗を横軸上に表示する。

- 🐇: 時間進捗
- 🐢: スライド進捗

### 🐇 が 🐢 より前にいる場合

時間の進みがスライド進捗より速い。

つまり、発表が予定より遅れている。

```text
開始 ───── 🐢 ───────── 🐇 ── 終了
```

### 🐢 が 🐇 より前にいる場合

スライド進捗が時間進捗より速い。

つまり、発表が予定より速い。

```text
開始 ───── 🐇 ───────── 🐢 ── 終了
```

### 🐇 と 🐢 が近い位置にいる場合

ほぼ予定通り。

```text
開始 ───────── 🐇🐢 ─────── 終了
```

---

## 進捗計算

### 時間進捗

```ts
const timeProgress = elapsedSeconds / durationSeconds
```

- `elapsedSeconds`: 発表開始からの経過秒数
- `durationSeconds`: 持ち時間の秒数
- 0.0 から 1.0 の範囲に丸める

### スライド進捗

```ts
const slideProgress = (currentPage - 1) / (totalPages - 1)
```

- `currentPage`: 現在ページ。1始まり
- `totalPages`: PDFの総ページ数
- 1ページしかない場合は 0 または 1 として扱う

### CSS配置

進捗をパーセントに変換して、アイコンの `left` に指定する。

```ts
const timePosition = `${Math.min(timeProgress, 1) * 100}%`
const slidePosition = `${Math.min(slideProgress, 1) * 100}%`
```

---

## トークメモ仕様

PDFから発表者ノートを直接取得するのはMVPでは対象外。

代わりに、PDFとは別にMarkdownまたはJSONでページごとのトークメモを管理する。

MVPでは、ユーザーが手で書きやすいためMarkdownを推奨する。

### トークメモのMarkdown例

```md
# 1

今日はPDF発表ビューアについて話します。
まず、なぜ作りたいかを説明します。

# 2

通常のPDFビューアでは、発表中に時間配分が見えにくいです。

# 3

そこで、時間進捗とスライド進捗を同時に表示します。
```

### パース仕様

- `# 数字` をページ番号として扱う
- 次の `# 数字` までを、そのページのトークメモとして扱う
- 該当ページのメモがない場合は空表示
- ページ番号はPDFのページ番号と一致させる

### 内部データ構造

```ts
type TalkNote = {
  page: number
  body: string
}

type TalkNotesByPage = Record<number, string>
```

---

## アプリ状態設計

```ts
type PresentationState = {
  pdfFile: File | null
  pdfDocument: unknown | null

  currentPage: number
  totalPages: number

  durationSeconds: number
  startedAt: number | null
  pausedElapsedSeconds: number
  isRunning: boolean

  talkNotesByPage: Record<number, string>
}
```

---

## コンポーネント案

```text
src/
  App.tsx
  components/
    PdfLoader.tsx
    PdfCanvas.tsx
    TimerControls.tsx
    ProgressRace.tsx
    TalkNotePanel.tsx
    PresenterLayout.tsx
  hooks/
    usePdfDocument.ts
    usePdfPageRenderer.ts
    usePresentationTimer.ts
    useKeyboardNavigation.ts
  utils/
    parseTalkNotes.ts
    formatTime.ts
    clamp.ts
```

---

## 各コンポーネントの責務

### App.tsx

- 全体状態を持つ
- PDF読み込みを管理する
- 発表時間を管理する
- 現在ページを管理する
- タイマー状態を管理する
- トークメモ状態を管理する

### PdfLoader.tsx

- PDFファイルの選択
- トークメモの入力または読み込み
- 発表時間の入力

### PdfCanvas.tsx

- PDF.jsを使って現在ページをcanvasに描画する
- `currentPage` が変わったら再描画する

### TimerControls.tsx

- 開始
- 一時停止
- リセット
- フルスクリーン

### ProgressRace.tsx

- 🐇 と 🐢 を表示する
- `timeProgress` と `slideProgress` を受け取る
- それぞれの進捗に応じて横位置に反映する

### TalkNotePanel.tsx

- 現在ページに対応するトークメモを表示する

### usePresentationTimer.ts

- 経過時間を計算する
- 残り時間を計算する
- 開始 / 一時停止 / リセットを提供する

### useKeyboardNavigation.ts

- キーボード入力を監視する
- ページ送りを行う

---

## PDF.js実装メモ

PDF.jsでやること。

1. `File` を `ArrayBuffer` に変換する
2. `pdfjsLib.getDocument({ data })` でPDFを読み込む
3. `pdf.getPage(currentPage)` でページを取得する
4. `page.getViewport({ scale })` でviewportを作る
5. canvasのサイズをviewportに合わせる
6. `page.render({ canvasContext, viewport })` で描画する

---

## タイマー仕様

### 開始

- `startedAt = Date.now()`
- `isRunning = true`

### 一時停止

- 現在までの経過秒数を `pausedElapsedSeconds` に加算する
- `startedAt = null`
- `isRunning = false`

### 再開

- `startedAt = Date.now()`
- `isRunning = true`

### リセット

- `startedAt = null`
- `pausedElapsedSeconds = 0`
- `isRunning = false`

### 経過秒数

```ts
function getElapsedSeconds(state: PresentationState): number {
  if (!state.isRunning || state.startedAt == null) {
    return state.pausedElapsedSeconds
  }

  return (
    state.pausedElapsedSeconds +
    Math.floor((Date.now() - state.startedAt) / 1000)
  )
}
```

---

## キーボード操作

### 対応キー

- `ArrowRight`: 次ページ
- `Space`: 次ページ
- `ArrowLeft`: 前ページ
- `Home`: 先頭ページ
- `End`: 最終ページ
- `f`: フルスクリーン切り替え
- `r`: タイマーリセット
- `p`: 一時停止 / 再開

### 注意

入力欄にフォーカスがある場合は、キーボードショートカットを無効にする。

---

## フルスクリーン仕様

- 発表画面のroot要素に対して `requestFullscreen()` を呼ぶ
- フルスクリーン解除は `document.exitFullscreen()` を使う
- `fullscreenchange` を監視して、UI状態を同期する

---

## 表示上の仕様

### 残り時間による表示変更

MVPでは簡易的に以下。

- 残り時間が 50% 以上: 通常表示
- 残り時間が 20% 未満: 注意表示
- 残り時間が 0 未満: 超過表示

### 超過時

残り時間をマイナス表示する。

```text
超過 01:23
```

---

## 受け入れ条件

### PDF表示

- PDFをアップロードすると1ページ目が表示される
- 総ページ数が表示される
- 次ページ、前ページに移動できる
- ページ範囲外には移動しない

### タイマー

- 発表時間を分単位で設定できる
- 開始すると経過時間が進む
- 一時停止すると経過時間が止まる
- 再開すると続きから進む
- リセットすると0に戻る

### 進捗表示

- 時間経過に応じて🐇が右に動く
- ページ移動に応じて🐢が右に動く
- 最終ページでは🐢が右端に到達する
- 持ち時間終了時に🐇が右端に到達する

### トークメモ

- Markdownでページごとのメモを入力できる
- 現在ページに対応するメモが表示される
- メモがないページでは空欄または「メモなし」と表示される

### フルスクリーン

- ボタンまたは `f` キーでフルスクリーンにできる
- Escで解除できる
- 解除後もアプリが壊れない

---

## 実装順序

### Step 1: プロジェクト作成

- Vite + React + TypeScriptで作成
- PDF.jsを導入
- 最低限の画面を表示する

### Step 2: PDF表示

- PDFアップロード
- 1ページ目表示
- ページ送り
- 現在ページ / 総ページ数表示

### Step 3: タイマー

- 発表時間入力
- 開始 / 一時停止 / リセット
- 経過時間 / 残り時間表示

### Step 4: うさぎとかめ風進捗

- 時間進捗を計算する
- スライド進捗を計算する
- 🐇 / 🐢 を横軸上に表示する

### Step 5: トークメモ

- Markdown入力欄を追加する
- `# 1`, `# 2` の形式をパースする
- 現在ページのメモを表示する

### Step 6: 発表向けUI調整

- フルスクリーン対応
- キーボードショートカット
- 余計なUIを隠す
- 視認性を上げる

---

## サンプルのトークメモ

```md
# 1

今日は、PDFスライド発表用のビューアについて話します。

# 2

通常のPDFビューアでは、発表時間や話す内容を同時に確認しにくいです。

# 3

そこで、時間進捗とスライド進捗をうさぎとかめのように表示します。

# 4

🐇は時間、🐢はスライド進捗を表します。
🐇が前に出すぎている場合、発表が遅れています。

# 5

最後に、今後は発表者画面と観客画面の分離も検討します。
```

---

## 将来的に追加したい機能

- 発表者画面と観客画面の分離
- 次スライドのプレビュー
- ページごとの目標通過時刻
- リハーサルログ
- 各ページの滞在時間記録
- PDFとトークメモのセット保存
- トークメモの編集UI
- テーマ切り替え
- 残り時間に応じたアニメーション
- 画像アイコンのカスタマイズ
- Markdown以外にJSON形式もサポート

---

## まず作るべき完成形

最初の完成形は以下。

- ローカルブラウザで動く
- PDFをアップロードできる
- ページ送りできる
- 10分などの持ち時間を設定できる
- 経過時間と残り時間が見える
- 🐇と🐢が進捗に応じて動く
- 現在ページのトークメモが表示される

この状態まで作れれば、発表練習や小規模なLTでは実用できる。

---

## Codexへの依頼文

上記仕様に従って、Vite + React + TypeScript + PDF.js でMVPを実装してください。

まずはローカルで動くWebアプリとして作成してください。

CSSはシンプルで構いません。

実装後、以下もREADMEに記載してください。

- 起動手順
- 使用方法
- 主要コンポーネントの説明
- トークメモMarkdownの書き方
- 今後追加できそうな機能
