# eikaiwa-log

My public English lesson log. It shows total hours, lesson count, the day streak (with its start date), hours this week / month / year (compared with the same span of the previous period), a heatmap by year with hours per year, lessons per month (DMM / NC), a calendar with minutes per day (for the heatmap and the calendar, only this year is open; older years back to the first lesson are folded), Daily News to review (Day-Week-Month), the top 15 Daily News articles for DMM and NC, and the last 20 lessons.

英会話レッスンの公開ログ。合計時間・レッスン数・連続日数（開始日つき）・今週／今月／今年の時間（前の期間の同じ時点と比較）・年ごとのヒートマップと年間時間・月別のレッスン数（DMM／NC）・日ごとの時間のカレンダー（ヒートマップとカレンダーは今年だけ表示、最初のレッスンの年までの去年以前は折りたたみ）・復習するデイリーニュース（Day-Week-Month）・DMM／NC 別のよく受けた記事トップ15・直近20件を表示する。

Live page / 公開ページ: https://keikmobile.github.io/eikaiwa-log/

## Data / データ

`publish.sh` reads the newest `lesson-history-*.json` (the dmm-lesson-tracker auto-export) on your Mac.
It writes only 4 files under `data/`. The raw file has teacher names, so it is never committed.

`publish.sh` は Mac 上で最新の `lesson-history-*.json`（dmm-lesson-tracker の自動エクスポート）を読む。
書き出すのは `data/` の4ファイルだけ。生ファイルは講師名を含むので、コミットしない。

- `data/summary.json`: export day (`as_of`), total minutes, lesson count, minutes per day, lessons (DMM / NC) and minutes per month (`by_month`), last 20 lessons with date, title and minutes.
  エクスポート日（`as_of`）・合計分数・レッスン数・日ごとの分数・月別のレッスン数（DMM／NC）と分数（`by_month`）・直近20件の日付・教材名・分数。
- `data/dwm.json`: Daily News lessons from exactly 1 day, 1 week and 30 days before today (JST), for review. Each item has `label`, `date`, `source` and `title` (the lesson type if there is no title); `items` is empty when nothing matches. It uses the plain JST date (no 25:30 rule). If the file is not from today, the page shows "as of".
  今日（JST）からちょうど1日前・1週間前・30日前のデイリーニュース（復習用）。各項目は `label`・`date`・`source`・`title`（教材名がなければレッスン種別）。該当なしなら `items` は空。日付は JST の日付そのまま（25:30 ルールなし）。今日のファイルでなければページに「as of」を表示する。
- `data/ranking.json`: the 15 Daily News articles you took most often, for DMM (`dmm`) and NC (`nativecamp`) separately. Each item has `title` and `count`. Lessons without a title are skipped; ties go by title order.
  受講回数の多いデイリーニュース記事トップ15を DMM（`dmm`）と NC（`nativecamp`）別に。各項目は `title`・`count`。教材名のないレッスンは除外、同数なら教材名順。

- `data/countries.json`: lessons per teacher country, for all time (`all`) and the export year (`this_year`, year in `year`). Each has `total`, the Top 10 (`top`: `name`, `count`) and the rest (`other`). Only country names, no teacher names. Lessons without a country are skipped.
  講師の国ごとのレッスン数。全期間（`all`）とエクスポート年（`this_year`、年は `year`）。それぞれ `total`・Top10（`top`：`name`・`count`）・残り（`other`）。国名のみで講師名は含まない。国のないレッスンは除外。

The page hides the review, ranking and country sections when their file is missing or empty.
復習・ランキング・国籍のセクションは、ファイルがないか空なら表示しない。

DMM lessons that start up to 25:30 (01:30) count as the previous day, like DMM does. / DMM と同じく、25:30（翌1:30）開始までのレッスンは前日扱い。
Lessons without a title are counted and shown as "—". A file in an unknown format is rejected.
教材名のないレッスンも数え、「—」と表示する。不明な形式のファイルは拒否する。

## Update / 更新

1. Turn on auto-export in the extension, or export the lesson history from the popup (saved to `~/Downloads`)
   拡張機能の自動エクスポートをオンにする（または popup から履歴をエクスポート）
2. Run / 実行:

```bash
./publish.sh
```

It writes the 3 JSON files, commits them, and pushes to `main` (the live page updates in 1–2 min). If nothing changed, it does not commit. It stops if you are not on `main`.
3つの JSON を書き出し、commit して `main` に push する（1〜2分で公開ページに反映）。変更がなければ commit しない。`main` ブランチでなければ止まる。

To only write the JSON files without git (works on any branch) / git を使わず JSON だけ書き出す（どのブランチでも可）:

```bash
./publish.sh -n
```

## Setup / 初期設定

1. Create the public repo `eikaiwa-log` on GitHub, then / GitHub で公開リポジトリを作成し:
   `git remote add origin https://github.com/<user>/eikaiwa-log.git`
   (SSH also works if your SSH key is registered on GitHub / SSH 鍵を登録済みなら SSH でも可)
2. Use your GitHub noreply email in this repo only (Settings → Emails) / このリポジトリだけ noreply アドレスを使う:
   `git config user.email <id>+<user>@users.noreply.github.com`
3. Settings → Pages → Deploy from branch `main` / root
   The page is at `https://<user>.github.io/eikaiwa-log/` (example: https://keikmobile.github.io/eikaiwa-log/)
   公開 URL は `https://<user>.github.io/eikaiwa-log/`（例：https://keikmobile.github.io/eikaiwa-log/）
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
