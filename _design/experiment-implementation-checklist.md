# 실험 코드베이스 구현 체크리스트

기준 설계: `_design/experiment-codebase-design-v0.1.md` (이하 "설계")
사용법: 위에서 아래로 진행한다. 각 항목의 "완료 조건" 을 확인한 뒤 체크한다. 단계 끝의 "다음 단계 진입 조건" 을 모두 만족하기 전에는 다음 단계로 가지 않는다.
설계와 이 체크리스트가 다르면 설계를 따르고, 차이를 이 문서에 반영한다.

---

## 0. 결정 확인

- [ ] 설계 §19 의 [결정 필요] 항목이 모두 정해져 있다
  - 완료 조건: §19 표의 상태 열에 결정 내용과 날짜가 적혀 있다
- [ ] 라이브러리 버전을 설계 §3.1 규칙(메이저 출시 후 6개월 이상, 그 메이저의 최신 minor)으로 정했다
  - 완료 조건: `lab/spec/versions.md` 에 각 버전과 메이저 출시일, 출처 URL 이 있다
- [ ] Storybook 의 Vitest addon 과 고른 Vitest 버전이 호환된다
  - 완료 조건: 빈 Vite 프로젝트에서 story 1개가 `vitest --project storybook` 으로 통과한다. 확인용 프로젝트는 삭제한다
- [ ] Gradle 읽기 전용 의존성 cache 가 동작한다
  - 완료 조건: 빈 `GRADLE_USER_HOME` + `GRADLE_RO_DEP_CACHE` + `--offline` 으로 빈 Spring Boot 프로젝트가 build 된다. 실패하면 대안(실행마다 cache 복사)을 설계 §15.2 에 적는다

다음 단계 진입 조건: 위 4개 완료.

---

## 1. 공통 명세 (`lab/spec/`)

- [ ] `requirements.md`: 설계 §4.1, §4.2 의 기능과 규칙
- [ ] `api.md`: 모든 endpoint, 요청 · 응답 JSON 예시, 오류 코드 목록과 HTTP 상태
- [ ] `scenarios.md`: 행동 시나리오 목록. ID 형식 `<영역 3글자>-<두 자리 번호>`, 각 시나리오에 입력 값과 기대 결과
  - 완료 조건: 실험 1 관련 시나리오(무료배송 경계값, 부분 환불 배송비 차감, 정책 조회)가 있다
- [ ] `seed.sql`: 회원 40, 주문 120, 배송 100, 환불 20, 관리자 계정 12
  - 완료 조건: 이름 · 부서명이 모두 20자 이하
  - 완료 조건: 실험 2 의 조회 8개(T2-M1 ~ T2-R2) 조건에 맞는 행이 각각 1개 이상 있다. 확인 SQL 8개를 `lab/spec/seed-checks.sql` 에 둔다
  - 완료 조건: 날짜 값은 고정 기준 시각(`Clock`)에 대한 상대값으로 계산돼 실행 날짜에 따라 결과가 바뀌지 않는다
- [ ] `ui.md`: 화면 9개, 열 구성, 메뉴 그룹과 순서, 1280px 기준

다음 단계 진입 조건: 명세 5개 파일이 commit 돼 있고, 다른 사람이 읽고 질문 없이 API 를 호출하는 시험을 쓸 수 있다.

---

## 2. 숨김 채점 (`lab/grading/`)

Variant 보다 먼저 쓴다.

- [ ] Playwright 프로젝트, `request` 로 API 시험, browser 로 화면 시험
- [ ] 기본 동작 시험: `scenarios.md` 의 ID 마다 1개 이상
- [ ] 화면 시험: 화면 9개 진입, 메뉴 권한별 노출
- [ ] 과제별 채점: `tasks/exp1/`, `tasks/exp2/<T2-ID>/`, `tasks/exp3/` (설계 §8 의 채점 항목)
- [ ] 실행 스크립트: Variant 디렉터리를 받아 jar build, frontend build, 한 port 로 기동, 채점 실행, 종료
  - 완료 조건: port 를 인자로 받고, 끝나면 프로세스가 남지 않는다

다음 단계 진입 조건: 채점 시험이 명세만으로 작성돼 있다(아직 대상 Variant 가 없으므로 실행은 4단계 이후).

---

## 3. Harness 골격 (`lab/harness/`)

- [ ] 컨테이너 이미지: JDK, Node, pnpm, Playwright Chromium, 고정 글꼴, Claude Code 고정 버전, `TZ=Asia/Seoul`, `LANG=ko_KR.UTF-8`, non-root 사용자
  - 완료 조건: 이미지 digest 를 `lab/harness/image.lock` 에 기록
- [ ] egress 제한: Anthropic API 도메인만 허용
  - 완료 조건: 컨테이너 안에서 `curl https://registry.npmjs.org` 가 실패하고 Claude Code 호출은 성공
- [ ] `export.sh <variant>`: 설계 §15.1
  - 완료 조건: 내보낸 저장소에서 `agentic`, `variant`, `실험`, `experiment` 검색 결과 0건, commit 1개, `CLAUDE.md` · `AGENTS.md` · `.claude/` 없음
- [ ] `run.sh <task> <variant> <run-id>`: clone, 의존성 offline 설치, Claude Code 실행, 결과 수집
  - 완료 조건: 실행마다 빈 `CLAUDE_CONFIG_DIR`, `--strict-mcp-config`, `--settings`(기록용 hook), `--session-id`, `--output-format stream-json --verbose --include-hook-events`, `--model`, `--effort`, `--max-budget-usd`, 시간 제한 45분
- [ ] 기록용 hook: `PreToolUse` · `PostToolUse` 입력에 기록 시각을 붙여 `hooks.jsonl` 에 추가. 시험 명령이면 그 명령 시작 이후 수정된 시험 결과 파일만 복사(설계 §14.3)
  - 완료 조건: hook 이 표준 출력에 아무것도 쓰지 않고 항상 exit 0
- [ ] stream 수신 시각을 각 줄에 붙이는 wrapper
- [ ] 빈 저장소로 pilot 1회
  - 완료 조건: `results/<run-id>/` 에 설계 §14.5 의 파일이 모두 생긴다

다음 단계 진입 조건: pilot 결과 파일이 모두 있고, 사용자 전역 설정(전역 `CLAUDE.md`, skill, MCP)이 세션 기록에 나타나지 않는다.

---

## 4. Variant A (`lab/variants/a/`)

- [ ] 구현 세션 준비: 연구 문서가 없는 별도 디렉터리에 `lab/spec/` 만 복사하고, 지시는 "Spring Boot 레이어 구조(controller, service, repository, domain, dto, config, common)와 React pages 구조로 명세를 구현하라" 로 한정
- [ ] backend: 설계 §7.2 구조
  - 완료 조건: 무료배송 판단은 `service/DeliveryFeePolicy` 한 곳. 기준 금액 숫자가 운영 코드에 한 번만 나온다
  - 완료 조건: `SecurityConfig` 는 영역 prefix 규칙
  - 완료 조건: ArchUnit L1, L2 통과
- [ ] frontend: 설계 §7.5 A 구조
  - 완료 조건: route · 메뉴 · 화면 권한이 `src/app/adminRoutes.tsx` 한 표에 있다
  - 완료 조건: 공통 `DataTable` 의 셀이 `white-space: nowrap`, 컨테이너가 `overflow-x: auto` (실험 3 의 원인, 설계 §8.3)
- [ ] 시험: 시나리오 ID 마다 1개, 이름에 ID 포함. 통합 시험 2개. E2E 와 보조 함수(`login`, `createStaff`, `createOrder`)
- [ ] README: 절 구성 = 개요, 실행, 시험 명령(`--tests` 필터 예 포함, "완료 전 `./gradlew test` 와 `pnpm test` 실행" 문장 포함), 디렉터리 구조, 규칙, 시험용 로그인 계정
- [ ] `./scripts/verify-all.sh`
- [ ] 숨김 채점 기본 동작 · 화면 시험 전부 통과
- [ ] 정상성 확인: §5.4 의 금지 항목(긴 함수, 의미 없는 이름, 거대 클래스, 복사 붙여넣기, 순환 의존, 시험 누락, 규칙 숫자 중복)이 없다

다음 단계 진입 조건: **사람 리뷰어가 설계 §16.3 체크리스트로 A 를 실무 PR 로 승인했다.** 승인 기록을 `lab/reviews/a-approval.md` 에 남긴다.

---

## 5. Variant B (`lab/variants/b/`)

A 를 복사한 뒤 차이 대장(설계 §6.4)의 항목만 바꾼다. 항목마다 별도 commit 으로 남긴다.

- [ ] D1: backend 를 기능 package + `internal` 로 이동. 메서드 본문은 고치지 않는다
- [ ] D2: 기능별 공개 interface(`MemberQuery`, `OrderQuery`, `DeliveryFeeQuery`)와 위임 클래스. 다른 기능 호출 줄만 interface 로 바꾼다. ArchUnit R1 ~ R4
- [ ] D3: frontend 를 `features/<영역>/<화면>/`, `shared/` 로 이동
- [ ] D4: 화면별 `admin-page.ts`, `shared/adminPage.ts`(`defineAdminPage`), `app/adminPages.ts`(glob 수집, 첫 줄에 수집 경로 주석), `shared/adminGroups.ts`, `adminPages.test.ts`(경로 · id 중복, `admin-page.ts` 누락), `pnpm admin-pages` 출력 스크립트
  - 완료 조건: 메뉴 순서 숫자 필드가 없다. 그룹 순서 고정 + 그룹 안 label 정렬
  - 완료 조건: 수집 코드가 30줄 안팎이고 생성 파일이 없다
- [ ] D5: 목록 표시 컴포넌트 5개에 `Default`, `Empty`, `Loading`, `Error`, `ManyRows` story, 영역별 `fixtures.ts` builder, `pnpm test:stories` (Vitest browser mode), 표준 상태 시각 기준 화면(컨테이너 이미지에서 생성)
  - 완료 조건: 긴 부서명 story, 위치 측정 helper, 긴 문자열 fixture 가 없다
  - 완료 조건: jsdom component 시험은 story 를 렌더링하되 시나리오 ID 와 assertion 은 A 와 같다
- [ ] D6: 기능별 오류 코드 enum, 로그에 `feature` · `operation` 추가. 응답 JSON 은 A 와 같다
- [ ] D7: ESLint `no-restricted-imports` 로 다른 기능 내부 import 금지
- [ ] README: A 와 같은 절 구성. 시험 명령 절의 문장은 A 와 같고 경로 예만 다르다. 분량 차이 20% 이내
- [ ] 숨김 채점 기본 동작 · 화면 시험 전부 통과

다음 단계 진입 조건: 위 항목 완료, B 의 git log 에서 차이 대장 ID 별 commit 을 확인할 수 있다.

---

## 6. 동일성 검사

설계 §16.2 를 스크립트로 만들고 통과시킨다. 스크립트는 `lab/harness/parity/` 에 둔다.

- [ ] API 응답 비교: 모든 GET endpoint, 오류 응답 표본 10개 이상. 차이 0
- [ ] 화면 screenshot 비교: 화면 9개. 차이 0
- [ ] 시나리오 ID 집합 비교: 동일
- [ ] 규칙 클래스 본문 비교: 동일. service 는 주입 타입 이름을 맞춘 뒤 동일
- [ ] 의존성 비교: Storybook 관련 패키지 외 차이 0
- [ ] 내보내기 검사: 두 Variant 모두 금지 문자열 0건
- [ ] 규모 보고서 생성: 운영 · 업무 동작 시험 · 구조 시험 · story LOC, 파일 수, cold build 시간, 전체 시험 시간(같은 기계 10회 중앙값)
  - 완료 조건: 업무 동작 시험 LOC 차이가 §19 에서 정한 기준 이내. 넘으면 원인을 고치거나 보고서에 이유를 적는다
- [ ] 설계 §10.2 의 단계별 예상 시간을 측정값으로 교체

다음 단계 진입 조건: 모든 검사 통과, 규모 보고서를 `lab/reviews/parity-report.md` 에 commit.

---

## 7. 지표 계산

- [ ] `lab/harness/metrics/` 에 설계 §14.4 지표 계산 스크립트
  - 완료 조건: 입력은 `results/<run-id>/` 뿐이고 Variant 이름을 읽지 않는다
- [ ] 분류 규칙(검색 · 읽기 · 시험 명령) 시험: pilot 기록에서 손으로 센 값과 스크립트 값이 같다
  - 완료 조건: 손으로 센 표본 3개 이상, 표본과 결과를 `lab/reviews/metrics-validation.md` 에 기록
- [ ] 스크립트 commit 후 실험 종료까지 수정 금지. 수정이 필요하면 모든 실행을 다시 계산하고 수정 이유를 기록

---

## 8. 과제와 사전 등록

- [ ] `lab/tasks/exp1/prompt.md`, `exp2/<T2-ID>/prompt.md`(8개), `exp3/prompt.md`: 설계 §8 의 공통 문구 형식
  - 완료 조건: 두 Variant 에 같은 파일을 쓴다. 문구에 Variant 를 구분하는 표현이 없다
- [ ] `lab/tasks/predictions.md`: 설계 §8 의 사전 등록 예측 원문
- [ ] 통합 Agent 문구(실험 2): `lab/tasks/exp2/integrator-prompt.md`
- [ ] 공통 경로 목록(설계 §14.4 "공통 파일 수정"): `lab/tasks/common-paths.json`
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

- [ ] 실험 1: Variant 당 5회, A/B 순서 무작위, 한 번에 1개 실행
- [ ] 실험 3: Variant 당 5회, A/B 순서 무작위, 한 번에 1개 실행
- [ ] 실험 2: Variant 당 3회. 회마다 8개 동시 실행 → 28쌍 3-way merge → 순차 통합(ID 사전순, 병합마다 검증) → 숨김 채점 8개
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
