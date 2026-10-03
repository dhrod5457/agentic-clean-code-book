#!/usr/bin/env bash
# backend 시험, frontend lint · component 시험 · E2E 를 순서대로 실행한다. 하나라도 실패하면 실패한다.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step() {
  printf '\n==> %s\n' "$1"
}

step "backend: ./gradlew test"
(cd "$root/backend" && ./gradlew test)

step "frontend: pnpm lint"
(cd "$root/frontend" && pnpm lint)

step "frontend: pnpm test"
(cd "$root/frontend" && pnpm test)

step "frontend: pnpm e2e"
(cd "$root/frontend" && pnpm e2e)

printf '\n모든 검사를 통과했습니다.\n'
