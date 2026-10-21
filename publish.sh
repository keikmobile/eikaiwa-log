#!/bin/sh
# Summarize the newest auto-export (lesson-history-*.json) from ~/Downloads, then commit and push.
# 最新の自動エクスポート（lesson-history-*.json）を ~/Downloads から読んで集計し、commit・push する。
set -eu
cd "$(dirname "$0")"

# Data updates go straight to main. On another branch they would be left out of the page.
# データ更新は main に直接入れる。別ブランチだと公開ページに反映されない。
if [ "$(git branch --show-current)" != main ]; then
  echo "Not on main. Run: git switch main / main ブランチではありません: git switch main" >&2
  exit 1
fi

src=$(ls -t "$HOME"/Downloads/lesson-history-*.json 2>/dev/null | head -1 || true)
if [ -z "$src" ]; then
  echo "No lesson-history-*.json in ~/Downloads / ファイルが見つかりません" >&2
  exit 1
fi

# The raw file has teacher names, so it never enters the repo.
# summarize() writes only date, title and minutes.
# 生ファイルは講師名を含むのでリポジトリに入れない。summarize() は日付・教材名・分数だけを書き出す。
mkdir -p data
node --input-type=module -e '
import { readFileSync, writeFileSync } from "fs";
import { lessonsFromHistory, summarize, dmmToday } from "./stats.js";
const payload = JSON.parse(readFileSync(process.argv[1], "utf8"));
const asOf = dmmToday(new Date(payload.exported_at));
writeFileSync("data/summary.json", JSON.stringify(summarize(lessonsFromHistory(payload), asOf), null, 1) + "\n");
' "$src"
git add data/summary.json
if git diff --cached --quiet; then
  echo "No changes / 変更なし"
  exit 0
fi
git commit -m "log: update $(date +%Y-%m-%d)"
git push
echo "Published / 公開しました: $src"
