# 숨김 채점

Variant 를 단일 port 로 띄운 뒤 HTTP 와 화면으로 동작을 확인하는 Playwright 시험이다.
실행용 저장소에 넣지 않는다. 기준은 `lab/spec/`(명세)와 `lab/tasks/`(과제 문구)다.

## 구성

| 경로 | 내용 | 데이터 변경 |
|---|---|---|
| `support/seed.ts` | `lab/spec/seed.sql` 을 읽어 기대값을 계산하는 파서 | - |
| `support/api.ts` | 로그인 context, API helper, `api.md` §2 의 오류 표 | - |
| `support/ui.ts` | 화면 로그인, 메뉴 · 표 읽기, `ui.md` §4 의 표시 형식 | - |
| `basic/` | `scenarios.md` 에서 외부 확인이 `HTTP` 인 시나리오 | 있음 |
| `screens/` | 외부 확인이 `화면` 인 시나리오 중 읽기만 하는 것. seed 값 그대로 표시를 확인 | 없음 |
| `ui-flows/` | 화면에서 쓰기 동작을 하는 시나리오(E2E-03 ~ 05) | 있음 |
| `tasks/exp1/` | 실험 1 채점(설계 §8.1) | 있음 |
| `tasks/exp2/` | 실험 2 채점 8개(설계 §8.2). `list-task.ts` 가 공통 시험을 만든다 | 없음 |
| `tasks/exp3/` | 실험 3 채점(설계 §8.3). 판정 화면 폭 1280×800 | 있음 |
| `diagnostics/` | 판정에 쓰지 않는 진단 시험. 실험 3 의 1024×768 기록(설계 §8.3) | 있음 |

`scenarios.md` 의 ORD-12 는 외부 확인이 불가라서 채점하지 않는다.

## 실행

준비(이 디렉터리에서 한 번):

```
pnpm install
pnpm exec playwright install chromium
```

채점(Java 25, Node.js 24.21.0, pnpm 10.34.6 필요):

```
./run.sh <Variant 저장소 경로> <port> <묶음>...
./run.sh ../variants/a 18080 basic screens ui-flows
./run.sh ../variants/a 18080 exp2/T2-M1
```

| 묶음 | 시험 경로 |
|---|---|
| `basic` | `basic/` |
| `screens` | `screens/` |
| `ui-flows` | `ui-flows/` |
| `exp1` | `tasks/exp1/` |
| `exp2` | `tasks/exp2/` 전체 |
| `exp2/<T2-ID>` | `tasks/exp2/<T2-ID>.spec.ts` |
| `exp3` | `tasks/exp3/` |
| `diag-exp3-1024` | `diagnostics/exp3-1024.spec.ts`. 진단 전용. 다른 묶음과 함께 주면 exit 2 |

- `run.sh` 는 Variant 의 `backend` 에서 `./gradlew bootJar`, `frontend` 에서 `pnpm install --frozen-lockfile` 과 `pnpm build` 를 실행한다. `GRADING_SKIP_BUILD=1` 이면 건너뛴다
- 묶음마다 `java -jar backend/build/libs/shop-admin.jar --server.port=<port> --shop.frontend.dist-dir=<frontend/dist>` 로 새로 띄워 seed 상태에서 시작하고, 시험이 끝나면 종료한다(`requirements.md` §8 · §9)
- port 를 이미 다른 프로세스가 쓰고 있으면 시작하지 않고 실패한다. 같은 port 로 `run.sh` 를 동시에 실행하지 않는다
- 결과는 `reports/`(또는 `GRADING_LOG_DIR`)에 묶음별 `junit-<묶음>.xml`, 애플리케이션 로그 `app-<묶음>.log`, Playwright 산출물 `test-results-<묶음>/`(실패 trace. 진단 묶음은 통과 여부와 관계없이 screenshot `staff-1024x768.png` 와 측정값 `measure.json`)로 남는다
- `diag-exp3-1024` 의 결과는 기록만 하고 실험 3 의 판정 · 점수에 쓰지 않는다. 판정 묶음 `exp3` 와 따로 실행해 종료 코드 · JUnit 이 섞이지 않게 한다
- 하나라도 실패하면 exit 1, 중단되면 exit 130 이다. 두 경우 모두 띄운 애플리케이션을 종료한다

이미 떠 있는 애플리케이션에 시험만 실행하려면:

```
GRADING_BASE_URL=http://localhost:18080 pnpm exec playwright test basic/
```

## 기대값

- 기대값은 시험 시작 시 `lab/spec/seed.sql` 을 읽어 계산한다. 다른 seed 를 쓰려면 `GRADING_SEED_SQL` 에 경로를 준다
- 기준 시각은 `2026-01-15T10:00:00+09:00` 이다. 애플리케이션은 `shop.clock.fixed-instant` 기본값으로 같은 시각에 고정돼 있어야 한다
- 실험 2 의 조건 · 정렬 · 열은 `lab/tasks/exp2/<T2-ID>/prompt.md` 와 같다. 메뉴는 해당 그룹에 항목이 있는지와 그룹 안 가나다순 정렬만 본다. 순차 통합 뒤 8개 항목이 함께 있어도 통과한다

## 채점 범위 밖

- 실험 1 의 "Variant 자체 시험 전체 통과" 는 harness 의 5단계 검증 결과(`verify.json`)로 판정한다
- 실험 3 의 "다른 목록 화면 4개" 기준 screenshot(`tasks/exp3/__screenshots__/`)은 체크리스트 7단계에서 실험 실행 이미지로 기준 commit 을 띄워 `pnpm exec playwright test tasks/exp3/ --update-snapshots` 로 만든다. 그 전에는 이 시험이 기준 파일이 없어 실패한다
