#!/usr/bin/env bash
# 숨김 채점 실행.
# 사용: ./run.sh <Variant 저장소 경로> <port> <묶음>...
# 묶음: basic, screens, ui-flows, exp1, exp2, exp2/<T2-ID>, exp3
# 묶음마다 애플리케이션을 새로 띄워 seed 상태에서 시험하고, 끝나면 종료한다.
# 환경 변수: GRADING_SKIP_BUILD=1 이면 build 를 건너뛴다. GRADING_LOG_DIR 로 결과 위치를 바꾼다.
set -euo pipefail

if [ $# -lt 3 ]; then
  echo "사용: $0 <Variant 저장소 경로> <port> <묶음>..." >&2
  exit 2
fi

VARIANT=$(cd "$1" && pwd)
PORT=$2
shift 2
HERE=$(cd "$(dirname "$0")" && pwd)
JAR="$VARIANT/backend/build/libs/shop-admin.jar"
DIST="$VARIANT/frontend/dist"
LOG_DIR=${GRADING_LOG_DIR:-$HERE/reports}
BASE_URL="http://localhost:$PORT"
mkdir -p "$LOG_DIR"

APP_PID=""
stop_app() {
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID"
    wait "$APP_PID" 2>/dev/null || true
  fi
  APP_PID=""
}
trap stop_app EXIT
trap 'stop_app; exit 130' INT TERM

suite_path() {
  case "$1" in
    basic) echo "basic/" ;;
    screens) echo "screens/" ;;
    ui-flows) echo "ui-flows/" ;;
    exp1) echo "tasks/exp1/" ;;
    exp2) echo "tasks/exp2/" ;;
    exp2/T2-*) echo "tasks/exp2/${1#exp2/}.spec.ts" ;;
    exp3) echo "tasks/exp3/" ;;
    *) echo "알 수 없는 묶음: $1" >&2; return 1 ;;
  esac
}

start_app() {
  if curl -s -o /dev/null "$BASE_URL/"; then
    echo "port $PORT 를 이미 다른 프로세스가 쓰고 있다" >&2
    return 1
  fi
  java -jar "$JAR" --server.port="$PORT" --shop.frontend.dist-dir="$DIST" >"$LOG_DIR/app-$1.log" 2>&1 &
  APP_PID=$!
  for _ in $(seq 1 120); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/me" || true)" = "401" ]; then
      return 0
    fi
    if ! kill -0 "$APP_PID" 2>/dev/null; then
      echo "애플리케이션이 시작 중에 종료됐다: $LOG_DIR/app-$1.log" >&2
      return 1
    fi
    sleep 1
  done
  echo "애플리케이션이 120초 안에 응답하지 않았다: $LOG_DIR/app-$1.log" >&2
  return 1
}

for s in "$@"; do suite_path "$s" >/dev/null; done

if [ "${GRADING_SKIP_BUILD:-0}" != "1" ]; then
  (cd "$VARIANT/backend" && ./gradlew --quiet bootJar)
  (cd "$VARIANT/frontend" && pnpm install --frozen-lockfile && pnpm build)
fi
[ -f "$JAR" ] || { echo "jar 가 없다: $JAR" >&2; exit 1; }
[ -f "$DIST/index.html" ] || { echo "frontend build 결과가 없다: $DIST" >&2; exit 1; }

failed=0
for s in "$@"; do
  name=${s//\//-}
  echo "== $s"
  start_app "$name"
  if ! (cd "$HERE" && GRADING_BASE_URL="$BASE_URL" GRADING_JUNIT="$LOG_DIR/junit-$name.xml" \
        pnpm exec playwright test "$(suite_path "$s")"); then
    failed=1
  fi
  stop_app
done
exit $failed
