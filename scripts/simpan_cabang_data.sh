#!/usr/bin/env bash
# Menyalin berkas hasil ke cabang `data` (orphan) dan mendorongnya. Dipakai GitHub Actions.
#   bash scripts/simpan_cabang_data.sh keluar/kapal.json [berkas lain...]
set -euo pipefail

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

if git fetch origin data 2>/dev/null; then
  git worktree add -q cabang-data origin/data
  (cd cabang-data && git checkout -q -B data origin/data)
else
  git worktree add -q --detach cabang-data
  (cd cabang-data && git checkout -q --orphan data && git rm -rfq . && echo "Cabang data: snapshot live (AIS, satelit). Ditulis otomatis oleh GitHub Actions." > README.md)
fi

for berkas in "$@"; do
  cp "$berkas" "cabang-data/$(basename "$berkas")"
done

cd cabang-data
git add -A
if git diff --cached --quiet; then
  echo "Tidak ada perubahan."
  exit 0
fi
git commit -q -m "Perbarui $(for b in "$@"; do basename "$b"; done | paste -sd' ')"
for percobaan in 1 2 3; do
  if git push origin data; then exit 0; fi
  git fetch origin data && git rebase origin/data || true
  sleep $((percobaan * 5))
done
exit 1
