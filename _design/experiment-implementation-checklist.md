# 실험 코드베이스 구현 체크리스트

기준 설계: `_design/experiment-codebase-design-v0.1.md` (이하 "설계")
사용법: 위에서 아래로 진행한다. 각 항목의 "완료 조건" 을 확인한 뒤 체크한다. 단계 끝의 "다음 단계 진입 조건" 을 모두 만족하기 전에는 다음 단계로 가지 않는다.
설계와 이 체크리스트가 다르면 설계를 따르고, 차이를 이 문서에 반영한다.

---

## 0A. 설계 · 도구 버전 동결

설계 §19.1 에 해당한다. 이 단계가 끝나면 1단계(`lab/spec`)와 2단계(`lab/grading`)를 시작할 수 있다.

- [x] 라이브러리 버전을 설계 §3.4 규칙(major line 최초 stable 후 6개월, 그 line 의 최신 stable minor · patch, 런타임은 LTS line)으로 정했다
  - 완료 조건: 설계 §3.4 결정표에 각 버전, major 최초 stable 출시일, 출처가 있다
- [x] Storybook 의 Vitest addon 과 고른 Vitest 버전이 호환된다
  - 완료 조건: 임시 Vite 프로젝트에서 story 1개가 `vitest --project=storybook` 으로 통과한다. 확인용 프로젝트는 삭제한다. 결과는 설계 §3.5
- [x] Gradle 읽기 전용 의존성 cache 가 동작한다
  - 완료 조건: network 없는 컨테이너에서 빈 `GRADLE_USER_HOME` + `GRADLE_RO_DEP_CACHE` 로 임시 Spring Boot 프로젝트가 build · test 된다. 결과는 설계 §3.5
- [x] `lab/` 위치를 정했다(설계 §19.1)

다음 단계 진입 조건: 위 4개 완료. 설계 상단 상태가 `FROZEN` 이다.

## 0B. harness 실행 결정

설계 §19.2 에 해당한다. 1 ~ 2단계와 병행할 수 있고, **3단계 진입 전에 완료**한다.

- [x] Claude 모델과 effort. 모델 학습 기준일과 설계 §3.4 의 major 출시일 관계를 함께 적는다
- [x] 실행당 · 전체 예산
- [x] 실행 기계(이 Mac 의 Docker 또는 Linux 노드)
- [x] API 인증 방식(실험 전용 key, 예산 한도, 컨테이너에 넣는 방법)
- [x] 원본 로그 보관 위치
- [x] timeout, retry, 병렬 실행, 실행 환경 고정 방법
  - 결정 위치: `_design/experiment-execution-contract-v0.1.md`(실행 계약). 설계 §19.2 는 각 항목의 결정 요약과 실행 계약 절을 가리킨다
  - 완료 조건(공통): 설계 §19.2 표의 상태 열에 결정 내용과 날짜가 적혀 있다

---

## 1. 공통 명세 (`lab/spec/`)

- [x] `requirements.md`: 설계 §4.1, §4.2 의 기능과 규칙
- [x] `api.md`: 모든 endpoint, 요청 · 응답 JSON 예시, 오류 코드 목록과 HTTP 상태
- [x] `scenarios.md`: 행동 시나리오 목록. ID 형식 `<영역 3글자>-<두 자리 번호>`, 각 시나리오에 입력 값, 기대 결과, 시험 단계(unit, web, integration, component, e2e)
  - 완료 조건: 실험 1 관련 시나리오(무료배송 경계값, 부분 환불 배송비 차감, 정책 조회)가 있다
- [x] `schema.sql`: 테이블과 열 정의. 설계 §4.3 의 열(회원 `last_login_at` · `withdrawn_at`, 배송 `fee` · `shipped_at` · `delivered_at`, 환불 `amount` · `requested_at`)을 포함한다
- [x] `seed.sql`: 회원 40, 주문 120, 배송 100, 환불 20, 관리자 계정 12. `schema.sql` 에 맞춘다
  - 완료 조건: 이름 · 부서명이 모두 20자 이하
  - 완료 조건: 실험 2 의 조회 8개(T2-M1 ~ T2-R2) 조건에 맞는 행이 각각 1개 이상 있다. 확인 SQL 8개를 `lab/spec/seed-checks.sql` 에 둔다
  - 완료 조건: 날짜 값은 고정 기준 시각(`Clock`)에 대한 상대값으로 계산돼 실행 날짜에 따라 결과가 바뀌지 않는다
- [x] `ui.md`: 화면 9개, 열 구성, 메뉴 그룹 순서, 버튼 이름, 1280px 기준
  - 완료 조건: 그룹 안 메뉴는 label 가나다순이다(두 Variant 동일, 설계 §8.2). 상세 화면은 메뉴에 넣지 않는다
  - 완료 조건: 표의 셀 텍스트는 줄바꿈하지 않고, 표가 컨테이너보다 넓으면 표 컨테이너에 가로 스크롤이 생긴다(설계 §8.3 의 원인이 되는 동작)
- [x] `versions.md`: 설계 §3.4 결정표와 보조 패키지의 버전. Variant A 구현 세션은 `lab/spec/` 만 받으므로 버전을 여기에 둔다
  - 완료 조건: 버전 값만 적고 선택 이유 · 실험 목적 · Variant 구분은 적지 않는다. B 전용 패키지(설계 §3.5)는 적지 않는다
  - 완료 조건: google-java-format 은 1.36.1 을 명시한다(설계 §3.5)
- [x] `conventions.md`: 설계 §5.5 의 구현 지시
  - 완료 조건: 실험 목적, Variant 구분, 과제 내용이 없다
- [x] `requirements.md` 에 다음 값을 정해 적는다
  - seed 의 고정 기준 시각과 그 시각을 `Clock` 으로 쓰는 설정 키(E2E, 숨김 채점, 실험 실행에서 사용, 설계 §4.3)
  - 부서명 최대 길이(120자 이상. 실험 3 채점이 120자 계정을 만든다)
  - 비밀번호 저장 방식, CSRF 처리, 정적 자원 제공과 SPA fallback
  - 환불 차감액을 노출하는 응답 필드, 환불 금액이 3,000원보다 작을 때의 처리(설계 §4.2)
- [x] `requirements.md` · `ui.md` 에 설계 §7.3 의 의존 방향을 거스르는 요구가 없다
  - 완료 조건: 회원 상세의 주문 목록, 주문 상세의 환불 이력, 탈퇴 시 주문 확인, 배송 상태 변경 시 환불 확인처럼 member → order, order → refund, delivery → refund 방향을 만드는 요구가 없다. 필요하면 설계 §7.3 을 먼저 고친다

다음 단계 진입 조건: 1단계 파일이 모두 commit 돼 있고, 다른 사람이 읽고 질문 없이 API 를 호출하는 시험을 쓸 수 있다.

---

## 2. 숨김 채점 (`lab/grading/`)

Variant 보다 먼저 쓴다. 과제 문구도 이 단계에서 먼저 고정한다. 과제별 채점이 문구의 경로 · 열 · 조건 · 메뉴 이름을 쓰기 때문이다.

- [x] 과제 문구: `lab/tasks/exp1/prompt.md`, `lab/tasks/exp2/<T2-ID>/prompt.md`(8개), `lab/tasks/exp3/prompt.md`. 설계 §8 의 공통 문구 형식
  - 완료 조건: 두 Variant 에 같은 파일을 쓴다. 문구에 Variant 를 구분하는 표현이 없다
  - 완료 조건: 실험 2 문구마다 화면 이름, API 경로, 응답 필드, 표시 열, 조건 경계, 메뉴 그룹 · 이름, 권한이 있다. 조건 경계에는 T2-O2 결제 금액의 배송비 포함 여부, T2-O1 에서 이미 기한이 지난 결제 대기 주문의 포함 여부, T2-R2 의 부분 환불 판별 기준을 적는다
- [x] Playwright 프로젝트, `request` 로 API 시험, browser 로 화면 시험. 화면 요소는 role 과 `ui.md` 의 이름으로 찾는다
- [x] 기본 동작 시험: `scenarios.md` 의 ID 마다 1개 이상. HTTP · 화면으로 확인할 수 없는 시나리오(예: 기준 변경 후 기존 주문 배송비 불변)는 `scenarios.md` 에 숨김 채점 제외와 이유를 적는다
- [x] 화면 시험: 화면 9개 진입, 쓰기 버튼 권한별 노출, 쓰기 API 권한별 403
- [x] 과제별 채점: `lab/grading/tasks/exp1/`, `lab/grading/tasks/exp2/<T2-ID>.spec.ts`, `lab/grading/tasks/exp3/` (설계 §8 의 채점 항목)
- [x] 실험 3 진단: `lab/grading/diagnostics/exp3-1024.spec.ts`, 묶음 `diag-exp3-1024`. 판정에 쓰지 않는다(설계 §8.3)
- [x] 실행 스크립트: Variant 디렉터리를 받아 jar build, frontend build, 한 port 로 기동, 채점 실행, 종료
  - 완료 조건: port 를 인자로 받고, 끝나면 프로세스가 남지 않는다

다음 단계 진입 조건: 채점 시험이 명세만으로 작성돼 있다(아직 대상 Variant 가 없으므로 실행은 4단계 이후).

---

## 3. Harness 골격 (`lab/harness/`)

진입 조건: 0B 완료. 설계와 실행 계약이 FROZEN.

- [ ] harness 골격: 실행 단위(입력 spec), 실행 상태 모델, `run.json` · `result.json`, environment fingerprint, 채점 adapter, 재실행, 실험 잠금(실행 계약 §6 ~ §9)
  - 완료 조건: 실제 Claude 호출 없이 가짜 process 로 정상 종료, Agent 비정상 종료, timeout, 채점 성공 · 실패, harness 내부 오류를 자동 시험으로 확인한다
- [ ] Docker Desktop VM 메모리 20GB 이상, 실험 기간 자동 갱신 끄기(실행 계약 §4.1)
- [ ] 컨테이너 연결 경로: workspace, 빈 `CLAUDE_CONFIG_DIR`, hook 출력, 읽기 전용 `/opt/cc/` 만 연결(실행 계약 §4.3)
  - 완료 조건: 컨테이너 안의 환경 변수 · 연결 경로 · hostname · `/opt/cc/` 파일 내용에 `agentic`, `variant`, `실험`, `experiment`, Variant 코드가 없다
- [ ] OOM · 외부 원인 종료 판정(`docker inspect`, `docker events`)과 재채점(`stage = after_agent` 실행을 source commit + `final.patch` 복사본으로 다시 채점, 최대 2회) (실행 계약 §6.3, §7)

- [ ] 컨테이너 이미지: JDK, Node, pnpm, Playwright Chromium, 고정 글꼴, Claude Code 고정 버전, `TZ=Asia/Seoul`, `LANG=ko_KR.UTF-8`, non-root 사용자
  - 완료 조건: 이미지 digest 를 `lab/harness/image.lock` 에 기록
  - 완료 조건: 설계 §3.5 의 Storybook smoke(story 1개 통과, 음성 대조 실패)를 이미지 안에서 다시 실행해 같은 결과가 나온다. 확인용 프로젝트는 삭제한다
- [ ] egress 제한: Anthropic API 도메인만 허용
  - 완료 조건: 컨테이너 안에서 `curl https://registry.npmjs.org` 가 실패하고 Claude Code 호출은 성공
- [ ] `export.sh <variant>`: 설계 §15.1
  - 완료 조건: 내보낸 저장소에서 `agentic`, `variant`, `실험`, `experiment` 검색 결과 0건, commit 1개, `CLAUDE.md` · `AGENTS.md` · `.claude/` 없음
- [ ] `run.sh <task> <variant> <run-id>`: clone, 의존성 offline 설치, Claude Code 실행, 결과 수집
  - 완료 조건: 실행마다 빈 `CLAUDE_CONFIG_DIR`, `--strict-mcp-config`, `--settings`(기록용 hook), `--dangerously-skip-permissions`(non-root 컨테이너와 egress 제한 조건에서만, 설계 §15.3), `--session-id`, `--output-format stream-json --verbose --include-hook-events`, `--model`, `--effort`, `--max-budget-usd`, 시간 제한 45분
  - 완료 조건: 실행마다 빈 `GRADLE_USER_HOME` 을 만들고 이미지의 `wrapper/dists` 를 복사한다. `GRADLE_RO_DEP_CACHE` 는 이미지 안 root 소유 경로를 가리킨다(설계 §15.2, 실행 계약 §4.3). cache 내용은 7단계에서 채운다
- [ ] 기록용 hook: `PreToolUse` · `PostToolUse` 입력에 기록 시각을 붙여 `hooks.jsonl` 에 추가. 시험 명령이면 그 명령 시작 이후 수정된 시험 결과 파일만 복사(설계 §14.3)
  - 완료 조건: hook 이 표준 출력에 아무것도 쓰지 않고 항상 exit 0
- [ ] stream 수신 시각 기록: 원본 줄을 바꾸지 않고 줄마다 수신 시각을 별도 파일에 쓴다(실행 계약 §8.4)
- [ ] 빈 저장소로 pilot 1회
  - 완료 조건: `runs/<run_id>/` 에 harness 가 만드는 파일(`run.json`, `result.json`, `raw/agent/stdout.jsonl`, 세션 기록, hook 기록, `artifacts/final.patch`)이 생긴다(실행 계약 §8.2). `verify.json`, `grading.json`, `metrics.json`, `review.json` 은 4 · 7단계 이후에 생기므로 이 단계의 조건이 아니다

다음 단계 진입 조건: 위 pilot 결과 파일이 있고, 사용자 전역 설정(전역 `CLAUDE.md`, skill, MCP)이 세션 기록에 나타나지 않는다.

---

## 4. Variant A (`lab/variants/a/`)

- [ ] 구현 세션 준비: 연구 문서가 없는 별도 디렉터리에 `lab/spec/` 만 복사하고(`seed-checks.sql` 은 실험 2 조회 조건을 담고 있으므로 뺀다), 지시는 "`lab/spec/` 의 명세를 `conventions.md` 에 따라 구현하라" 로 한정
- [ ] 의존성: Gradle 선언과 `pnpm-lock.yaml` 의 직접 의존성 버전이 `lab/spec/versions.md` 와 같다. Gradle wrapper 는 9.8.0
- [ ] backend: 설계 §7.2 구조
  - 완료 조건: 무료배송 판단은 `service/DeliveryFeePolicy` 한 곳. 기준 금액 숫자가 운영 코드에 한 번만 나온다
  - 완료 조건: `SecurityConfig` 는 영역 prefix 규칙
  - 완료 조건: ArchUnit L1, L2 통과
  - 완료 조건: 영역 사이 호출이 `conventions.md` 의 방향을 따르고, 주고받는 인자와 반환값이 요약 record · enum · `Money` · ID 뿐이다(설계 §5.5, §7.3)
- [ ] frontend: 설계 §7.5 A 구조
  - 완료 조건: route · 메뉴 · 화면 권한이 `src/app/adminRoutes.tsx` 한 표에 있다
  - 완료 조건: 공통 `DataTable` 이 `ui.md` 의 셀 줄바꿈 · 가로 스크롤 동작을 따른다(실험 3 의 원인, 설계 §8.3)
- [ ] 시험: 시나리오 ID 마다 1개, 이름에 ID 포함. 통합 시험 2개. E2E 와 보조 함수(`login`, `createStaff`, `createOrder`)
- [ ] README: 절 구성 = 개요, 실행, 시험 명령(필터 예 `./gradlew test --tests '*StaffServiceTest'`, "완료 전 `./gradlew test` 와 `pnpm test` 실행" 문장 포함), 디렉터리 구조, 규칙, 시험용 로그인 계정
- [ ] `./scripts/verify-all.sh`
- [ ] harness 연동 설정: Vitest · Playwright JUnit 결과가 `frontend/reports/junit-vitest.xml`, `frontend/reports/junit-e2e.xml` 에 생기고, E2E 가 `APP_PORT` 를 읽는다(설계 §5.5)
- [ ] 숨김 채점 기본 동작 · 화면 시험 전부 통과
- [ ] 정상성 확인: §5.4 의 금지 항목(긴 함수, 의미 없는 이름, 거대 클래스, 복사 붙여넣기, 순환 의존, 시험 누락, 규칙 숫자 중복)이 없다

A 승인 요청 전 gate: 설계 §19.3 의 A 사람 리뷰자와 정상성 판정 방법이 정해져 있다.

다음 단계 진입 조건: **사람 리뷰어가 설계 §16.3 체크리스트로 A 를 실무 PR 로 승인했다.** 승인 기록을 `lab/reviews/a-approval.md` 에 남긴다.

---

## 5. Variant B (`lab/variants/b/`)

A 를 복사한 뒤 차이 대장(설계 §6.4)의 항목만 바꾼다. 항목마다 별도 commit 으로 남긴다.

- [ ] D1: backend 를 기능 package + `internal` 로 이동. 메서드 본문은 고치지 않는다
- [ ] D2: 기능별 공개 interface(`MemberQuery`, `OrderQuery`, `DeliveryFeeQuery`, `DeliveryTracking`)와 위임 클래스. 다른 기능 호출 줄만 interface 로 바꾸고, interface 메서드 이름은 A 의 service 메서드 이름과 같게 둔다. ArchUnit R1 ~ R4
  - 완료 조건: R2 · R4 를 통과시키려고 메서드 본문을 고친 곳이 없다. 고쳐야 하면 A 를 고치고 A 확인을 다시 받는다(설계 §6.1)
- [ ] D3: frontend 를 `features/<영역>/<화면>/`, `shared/` 로 이동
- [ ] D4: 화면별 `admin-page.ts`, `shared/adminPage.ts`(`defineAdminPage`), `app/adminPages.ts`(glob 수집, 첫 줄에 수집 경로 주석), `shared/adminGroups.ts`, `adminPages.test.ts`(경로 · id 중복, `admin-page.ts` 누락), `pnpm admin-pages` 출력 스크립트
  - 완료 조건: 메뉴 순서 숫자 필드가 없다. 그룹 순서 고정 + 그룹 안 label 정렬
  - 완료 조건: 수집 코드가 30줄 안팎이고 생성 파일이 없다
- [ ] D5: 목록 표시 컴포넌트 5개에 `Default`, `Empty`, `Loading`, `Error`, `ManyRows` story, 영역별 `fixtures.ts` builder, `pnpm test:stories` (Vitest browser mode)
  - 완료 조건: 시각 기준 화면(`toMatchScreenshot`)이 없다. `DataTable` 과 배송 정책 화면에 story 가 없다(설계 §7.4, §11.1)
  - 완료 조건: `pnpm test` 는 `vitest run --project=unit` 으로 jsdom 시험만 실행한다(설계 §11.1)
  - 완료 조건: 긴 부서명 story, 위치 측정 helper, 긴 문자열 fixture 가 없다
  - 완료 조건: B 에만 추가한 직접 의존성이 `storybook`, `@storybook/react-vite`, `@storybook/addon-vitest`, `@vitest/browser-playwright` 네 개뿐이다. `storybook add` 가 넣는 `@vitest/coverage-v8` 은 제거한다(설계 §3.5). `@vitest/browser-playwright` 의 peer `playwright` 가 lockfile 에 새 항목으로 생기는지 확인하고 결과를 parity 보고서에 적는다
  - 완료 조건: jsdom component 시험은 story 를 렌더링하되 시나리오 ID 와 assertion 은 A 와 같다
- [ ] D6: v0.1 에서 제외(설계 §13). 오류 코드 enum 과 로그 필드는 A 와 같다
- [ ] D7: ESLint `no-restricted-imports` 로 다른 기능 내부 import 금지
- [ ] README: A 와 같은 절 구성. 시험 명령 절은 A 의 문장 그대로에 B 전용 명령 두 줄(`pnpm test:stories [필터]`, `pnpm admin-pages`)만 더한다. 디렉터리 구조 절과 규칙 절은 각 구조를 설명한다(B 는 기능 package · `internal` · ArchUnit R1 ~ R4 · ESLint 경계 규칙, A 는 레이어 · ArchUnit L1 · L2). 분량 차이 20% 이내
- [ ] 숨김 채점 기본 동작 · 화면 시험 전부 통과

다음 단계 진입 조건: 위 항목 완료, B 의 git log 에서 차이 대장 ID 별 commit 을 확인할 수 있다.

---

## 6. 동일성 검사

설계 §16.2 를 스크립트로 만들고 통과시킨다. 스크립트는 `lab/harness/parity/` 에 둔다.

- [ ] API 응답 비교: 모든 GET endpoint, 오류 응답 표본 10개 이상. 차이 0
- [ ] 화면 screenshot 비교: 화면 9개. 차이 0
- [ ] 시나리오 ID 집합 비교: 동일
- [ ] 규칙 클래스 본문 비교: 동일. service 는 주입 타입 이름과 필드 이름을 대응표로 맞춘 뒤 동일
- [ ] 의존성 비교: 설계 §16.2 의 B 전용 패키지와 그 전이 의존성 외 차이 0
- [ ] 내보내기 검사: 두 Variant 모두 금지 문자열 0건. 실험 2 과제의 API 경로 8개와 화면 label 8개도 0건
- [ ] 규모 보고서 생성: 운영 · 업무 동작 시험 · 구조 시험 · story LOC, 파일 수, cold build 시간, 전체 시험 시간(같은 기계 10회 중앙값)
  - 완료 조건: 업무 동작 시험 LOC 차이가 설계 §19.4 에서 정한 기준 이내. 넘으면 원인을 고치거나 보고서에 이유를 적는다
  - gate: 이 항목을 판정하기 전에 설계 §19.4 의 parity 규모 차이 허용 기준이 정해져 있다
- [ ] 설계 §10.2 의 단계별 예상 시간을 측정값으로 교체

다음 단계 진입 조건: 모든 검사 통과, 규모 보고서를 `lab/reviews/parity-report.md` 에 commit.

---

## 7. 지표 계산

- [ ] 의존성 cache 를 넣은 이미지 재작성(설계 §15.2). 3단계 이미지를 기반으로 cache 층만 더해 글꼴 · Chromium 은 바꾸지 않는다. 실험 3 기준 screenshot, 보정 실행과 이후 모든 실행이 이 이미지를 쓴다
  - 완료 조건: 두 Variant 에서 `./gradlew build` 와 `pnpm install` 로 seed 한 `modules-2`(`*.lock`, `gc.properties` 제외)와 pnpm store, `wrapper/dists` 가 이미지에 있다
  - 완료 조건: `--network none` 컨테이너에서 두 Variant 의 `./gradlew test` 와 `pnpm install --offline --frozen-lockfile` 이 통과한다. 새 digest 를 `lab/harness/image.lock` 에 기록
- [ ] 실험 3 채점 기준선: 기준 commit 의 seed 데이터로 설계 §8.3 의 버튼 위치 조건이 판정 화면 폭 1280×800 에서 두 Variant 모두 이미 성립한다. 진단 화면 폭 1024×768(묶음 `diag-exp3-1024`)의 결과는 기록만 한다
- [ ] 실험 3 채점의 "다른 목록 화면 4개" 기준 screenshot 을 기준 commit 에서 만들어 `lab/grading/tasks/exp3/` 에 commit 한다(바로 위의 실행 이미지에서 생성)
- [ ] 실험 3 의 세 가지 수정 방식(열 정의 말줄임 옵션, 관리자 계정 표 열 폭, `nowrap` 전체 제거)을 임시 branch 에서 각각 적용해 채점을 통과하는지 확인한다. 통과하지 않는 방식이 있으면 설계 §8.3 의 "셋 다 통과" 서술을 고친다. 임시 branch 는 지운다
- [ ] `lab/harness/metrics/` 에 설계 §14.4 지표 계산 스크립트
  - 완료 조건: 입력은 `runs/<run_id>/` 와 공통 경로 목록뿐이고 `run.json` 의 `variant` 를 읽지 않는다. 공통 경로 목록은 두 Variant 의 패턴을 합친 하나의 목록이다(설계 §14.4). 이 목록을 7단계에서 만들어 `lab/tasks/common-paths.json` 에 둔다
- [ ] 보정 실행: 실험 과제가 아닌 보정 과제 1개(예: 관리자 계정 목록에 생성일 열 추가)를 A · B 에 1회씩 실행한다. 결과는 분석에서 뺀다
- [ ] 분류 규칙(검색 · 읽기 · 시험 명령) 시험: 보정 실행 기록에서 손으로 센 값과 스크립트 값이 같다
  - 완료 조건: 손으로 센 표본 3개 이상, 표본과 결과를 `lab/reviews/metrics-validation.md` 에 기록
- [ ] 스크립트 commit 후 실험 종료까지 수정 금지. 수정이 필요하면 모든 실행을 다시 계산하고 수정 이유를 기록

---

## 8. 과제와 사전 등록

- [ ] 과제 문구는 2단계에서 고정했다. 이후 바꾸면 이유를 기록하고 과제별 채점을 같이 고친다
- [ ] `lab/tasks/predictions.md`: 설계 §8 의 사전 등록 예측 원문
- [ ] 통합 Agent 문구(실험 2): `lab/tasks/exp2/integrator-prompt.md`
- [ ] 실행 순서 파일: 실험 1 · 3 의 `lab/tasks/<실험>/schedule.json` 과 실험 2 회차 순서, seed 와 생성 스크립트(실행 계약 §7.1)
- [ ] 기준 commit 에 tag `lab-v0.1-base`

다음 단계 진입 조건: tag 가 있고, tag 이후 `lab/variants/`, `lab/grading/`, `lab/tasks/`, `lab/harness/metrics/` 를 고치지 않는다.

---

## 9. Pilot

- [ ] 실험 1 · 3 은 Variant 당 1회, 실험 2 는 Variant 당 2개 동시 실행
- [ ] 결과 파일이 모두 생기고 지표가 계산된다
- [ ] harness 문제를 고쳤다면 tag 를 옮기고 이유를 `lab/reviews/pilot.md` 에 기록
- [ ] pilot 결과는 분석에서 뺀다

---

## 10. 실험 실행

진입 gate: 설계 §19.4 의 반복 횟수 변경 여부(pilot 결과 확인 후)와 사람 검토자 2명이 정해져 있다.

- [ ] 실험 1: Variant 당 5회, A/B 순서 무작위, 한 번에 1개 실행
- [ ] 실험 3: Variant 당 5회, A/B 순서 무작위, 한 번에 1개 실행
- [ ] 실험 2: Variant 당 3회. 회마다 8개 실행(동시 2개, 실행 계약 §4.2) → 28쌍 3-way merge → 순차 통합(ID 사전순, 병합마다 검증) → 숨김 채점 8개
- [ ] 실행마다 `run.json` 에 Claude Code 버전, 모델, effort, 이미지 digest 가 기록돼 있다
- [ ] 실행이 harness 오류로 끝나면 결과에서 빼지 않고 오류 실행으로 표시한 뒤 다시 실행한다

---

## 11. 분석과 검토

- [ ] 지표를 실험 · Variant 별로 표로 만든다. 한 점수로 합치지 않는다
- [ ] 사람 검토자 2명이 `final.patch` 를 판정한다. 실행 ID 만 보여 준다. 불일치를 기록한다
- [ ] 사전 등록 예측과 결과를 나란히 적는다. 예측과 다른 결과도 그대로 적는다
- [ ] 결과 문서에 과제 원문, 기준 commit, Agent 설정, 실행 횟수, 원본 결과 위치, 실패 사례, 최종 diff, 판정 기준을 넣는다(`_research/15` §12)
- [ ] 설계 §17 의 한계 중 결과 해석에 영향을 준 것을 결과 문서에 적는다

---

## 실험 중단 조건

다음 중 하나가 나오면 실행을 멈추고 설계를 다시 본다(`_research/15` §13).

- 실험 1 에서 B 의 읽은 파일 수 중앙값이 A 의 절반 이하이거나 성공률 차이가 40%p 이상이다. 설계가 차이가 작다고 예측한 과제이므로 harness 나 Variant 구현의 편향을 먼저 조사한다. 결과는 버리지 않고 조사 내용과 함께 기록한다
- 두 Variant 모두 성공률이 20% 미만이거나 둘 다 100% 이고 과정 지표도 같다
- 같은 Variant 의 반복 실행 결과 분산이 커서 5회로 패턴이 보이지 않는다
- 지표 계산 스크립트가 일부 실행의 도구 기록을 분류하지 못한다
