#!/bin/sh
# Summarize the newest "教材リストをエクスポート" file from ~/Downloads, then commit and push.
# 最新の教材リスト JSON を ~/Downloads から読んで集計し、commit・push する。
set -eu
cd "$(dirname "$0")"

src=$(ls -t "$HOME"/Downloads/lesson-materials-*.json 2>/dev/null | head -1 || true)
if [ -z "$src" ]; then
  echo "No lesson-materials-*.json in ~/Downloads / ファイルが見つかりません" >&2
  exit 1
fi

# Refuse anything but the public fields, so the full history (teacher names etc.) is never published.
# 公開用フィールド以外を含むファイルは拒否（講師名入りの全履歴を誤って公開しないため）
node -e '
const rows = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const ok = new Set(["date", "material_title", "material_title_ja", "duration_min"]);
if (!Array.isArray(rows)) throw new Error("not an array");
for (const r of rows) for (const k of Object.keys(r)) if (!ok.has(k)) throw new Error("unexpected field: " + k);
' "$src"

# Publish only the summary the page needs. The raw file is never copied into the repo.
# ページに必要な集計だけを公開。生ファイルはリポジトリにコピーしない。
mkdir -p data
node --input-type=module -e '
import { readFileSync, writeFileSync } from "fs";
import { summarize } from "./stats.js";
writeFileSync("data/summary.json", JSON.stringify(summarize(JSON.parse(readFileSync(process.argv[1], "utf8"))), null, 1) + "\n");
' "$src"
git add data/summary.json
if git diff --cached --quiet; then
  echo "No changes / 変更なし"
  exit 0
fi
git commit -m "log: update $(date +%Y-%m-%d)"
git push
echo "Published / 公開しました: $src"
