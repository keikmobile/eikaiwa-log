# eikaiwa-log

My public English lesson log. It shows total hours, lesson count, a 12-month heatmap, and the last 20 lessons.

英会話レッスンの公開ログ。合計時間・レッスン数・12か月のヒートマップ・直近20件を表示する。

## Data / データ

`publish.sh` reads the newest `lesson-history-*.json` (the dmm-lesson-tracker auto-export) on your Mac.
It writes only `data/summary.json` (total minutes, lesson count, minutes per day, last 20 lessons with date, title and minutes).
The raw file has teacher names, so it is never committed.

`publish.sh` は Mac 上で最新の `lesson-history-*.json`（dmm-lesson-tracker の自動エクスポート）を読む。
書き出すのは `data/summary.json`（合計分数・レッスン数・日ごとの分数・直近20件の日付・教材名・分数）だけ。
生ファイルは講師名を含むので、コミットしない。

Lessons without a title are counted and shown as "—". A file in an unknown format is rejected.
教材名のないレッスンも数え、「—」と表示する。不明な形式のファイルは拒否する。

## Update / 更新

1. Turn on auto-export in the extension, or export the lesson history from the popup (saved to `~/Downloads`)
   拡張機能の自動エクスポートをオンにする（または popup から履歴をエクスポート）
2. Run / 実行:

```bash
./publish.sh
```

It writes `data/summary.json`, commits it, and pushes to `main` (the live page updates in 1–2 min). If nothing changed, it does nothing.
`data/summary.json` を書き出し、commit して `main` に push する（1〜2分で公開ページに反映）。変更がなければ何もしない。

## Setup / 初期設定

1. Create the public repo `eikaiwa-log` on GitHub, then / GitHub で公開リポジトリを作成し:
   `git remote add origin https://github.com/<user>/eikaiwa-log.git`
   (SSH also works if your SSH key is registered on GitHub / SSH 鍵を登録済みなら SSH でも可)
2. Use your GitHub noreply email in this repo only (Settings → Emails) / このリポジトリだけ noreply アドレスを使う:
   `git config user.email <id>+<user>@users.noreply.github.com`
3. Settings → Pages → Deploy from branch `main` / root
4. Node.js 22+ is needed for `publish.sh` and tests / `publish.sh` とテストに Node.js 22 以上が必要

## Preview / プレビュー

```bash
python3 -m http.server 8767
```

Open http://localhost:8767/ (opening `index.html` directly fails, because `fetch` does not work from `file://`).
http://localhost:8767/ を開く（`index.html` を直接開くと `fetch` が動かず失敗する）。

## Test / テスト

```bash
node --test
```
