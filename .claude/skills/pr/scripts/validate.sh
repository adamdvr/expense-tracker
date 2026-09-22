#!/usr/bin/env bash
# Проверяет, что из ветки можно открыть PR в master.
#
# Использование: validate.sh [<ветка>]
#   Ветка не передана — берётся текущая (git branch --show-current).
#
# Коды выхода:
#   0 — ветка валидна (имя ветки печатается в stdout)
#   1 — ветка не проходит проверку (причина — в stderr)
#   2 — ошибка окружения (не git-репозиторий, лишние аргументы)

set -euo pipefail

BRANCH_PATTERN='^(feat|fix|refactor|perf|docs|style|test|build|ci|chore)/[a-z0-9]+(-[a-z0-9]+)+$'

fail() {
  echo "validate: $1" >&2
  exit "${2:-1}"
}

[ "$#" -le 1 ] || fail "ожидается не больше одного аргумента: [<ветка>]" 2

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "не git-репозиторий" 2

branch="${1:-}"
if [ -z "$branch" ]; then
  branch="$(git branch --show-current)"
  [ -n "$branch" ] || fail "detached HEAD — переключись на рабочую ветку или передай её аргументом"
fi

[ "$branch" != "master" ] || fail "PR из master не создаётся — нужна рабочая ветка <type>/<scope>-<описание>"

[[ "$branch" =~ $BRANCH_PATTERN ]] || fail "ветка '$branch' не соответствует формату <type>/<scope>-<описание> (type: feat|fix|refactor|perf|docs|style|test|build|ci|chore; латиница в нижнем регистре, kebab-case)"

git show-ref --verify --quiet "refs/heads/$branch" || fail "локальной ветки '$branch' нет"

echo "$branch"
