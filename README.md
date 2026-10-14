# eikaiwa-log

My public English lesson log. It shows total hours, lesson count, a 12-month heatmap, and the last 20 lessons.

英会話レッスンの公開ログ。合計時間・レッスン数・12か月のヒートマップ・直近20件を表示する。

## Data / データ

`data/lessons.json` is the file from "📚 教材リストをエクスポート" in the dmm-lesson-tracker extension, unchanged.
It has only `date`, `material_title`, `material_title_ja`, and `duration_min`. No teacher names, no times of day.

`data/lessons.json` は dmm-lesson-tracker 拡張機能の「📚 教材リストをエクスポート」のファイルそのまま。
含むのは `date`・`material_title`・`material_title_ja`・`duration_min` のみ。講師名・時刻は含まない。

## Update / 更新

1. Popup → 📚 教材リストをエクスポート (saved to `~/Downloads`) / popup でエクスポート
2. Run / 実行:

```bash
./publish.sh
```

It only accepts the 4 public fields, so the full history file cannot be published by mistake.
公開用の4フィールド以外を含むファイルは拒否するので、全履歴を誤って公開することはない。

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
