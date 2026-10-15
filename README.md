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

## Update / 更新

1. Turn on auto-export in the extension, or export the lesson history from the popup (saved to `~/Downloads`)
   拡張機能の自動エクスポートをオンにする（または popup から履歴をエクスポート）
2. Run / 実行:

```bash
./publish.sh
```

## Setup / 初期設定

1. Create the public repo `eikaiwa-log` on GitHub, then / GitHub で公開リポジトリを作成し:
   `git remote add origin git@github.com:<user>/eikaiwa-log.git`
2. Use your GitHub noreply email in this repo only (Settings → Emails) / このリポジトリだけ noreply アドレスを使う:
   `git config user.email <id>+<user>@users.noreply.github.com`
3. Settings → Pages → Deploy from branch `main` / root

## Test / テスト

```bash
node --test
```
