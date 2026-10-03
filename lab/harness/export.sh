#!/usr/bin/env bash
# 실행용 저장소 내보내기(설계 §15.1).
# 사용: ./export.sh <Variant 디렉터리> <출력 상위 디렉터리>
# <출력 상위 디렉터리>/shop-admin 에 작성용 저장소 HEAD 의 Variant 디렉터리 내용만 담은 새 git 저장소를 만든다. commit 은 1개다.
# 검사: 금지 문자열(agentic, variant, 실험, experiment)이 파일 내용(binary 포함) · 경로 이름에 0건,
#       하위 디렉터리를 포함해 CLAUDE.md · CLAUDE.local.md · AGENTS.md · .claude/ 없음(대소문자 무시), commit 1개.
# 성공하면 마지막 줄에 commit SHA 를 출력한다. 검사에 실패하면 출력 저장소를 지우고 exit 1 이다.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "사용: $0 <Variant 디렉터리> <출력 상위 디렉터리>" >&2
  exit 2
fi
SRC=$(cd "$1" && pwd)
OUT_PARENT=$2
OUT="$OUT_PARENT/shop-admin"
if [ -e "$OUT" ]; then
  echo "이미 있다: $OUT" >&2
  exit 2
fi

# host 전역 git 설정과 사용자 정보가 들어가지 않게 한다. 날짜를 고정해 같은 내용이면 같은 commit SHA 가 나온다
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=dev GIT_AUTHOR_EMAIL=dev@localhost GIT_COMMITTER_NAME=dev GIT_COMMITTER_EMAIL=dev@localhost
export GIT_AUTHOR_DATE=2026-01-01T00:00:00+0900 GIT_COMMITTER_DATE=2026-01-01T00:00:00+0900

mkdir -p "$OUT"
# 작성용 저장소 HEAD 에 commit 된 Variant 디렉터리 내용만 내보낸다. 작업 트리의 미commit 변경 · 미추적 파일 · build 산출물은 넣지 않는다
PREFIX=$(git -C "$SRC" rev-parse --show-prefix)
# archive 는 하위 디렉터리에서 실행하면 범위가 한 번 더 좁혀지므로 저장소 최상위에서 실행한다
git -C "$(git -C "$SRC" rev-parse --show-toplevel)" archive --format=tar "HEAD:${PREFIX}" | tar -xf - -C "$OUT"
echo "source: $(git -C "$SRC" rev-parse HEAD):${PREFIX}" >&2

fail() {
  echo "내보내기 검사 실패: $1" >&2
  rm -rf "$OUT"
  exit 1
}

FORBIDDEN='agentic|variant|실험|experiment'
# macOS 의 bind mount 는 대소문자를 구분하지 않으므로 이름을 대소문자 없이 비교한다
guides=$(cd "$OUT" && find . \( -iname CLAUDE.md -o -iname CLAUDE.local.md -o -iname AGENTS.md -o -iname .claude \) | sed 's|^\./||')
[ -z "$guides" ] || fail "지침 파일이 있다: $(echo "$guides" | tr '\n' ' ')"
if names=$(cd "$OUT" && find . -mindepth 1 | sed 's|^\./||' | grep -iE "$FORBIDDEN"); then
  fail "금지 문자열이 있는 경로: $(echo "$names" | tr '\n' ' ')"
fi
if found=$(grep -railE "$FORBIDDEN" "$OUT"); then
  fail "금지 문자열이 있는 파일: $(echo "$found" | sed "s|$OUT/||" | tr '\n' ' ')"
fi

git -C "$OUT" init --quiet -b main
git -C "$OUT" add -A
git -C "$OUT" commit --quiet -m "Initial commit"
[ "$(git -C "$OUT" rev-list --count HEAD)" = 1 ] || fail "commit 이 1개가 아니다"
git -C "$OUT" rev-parse HEAD
