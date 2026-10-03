# A/B 실험 코드베이스 설계 v0.1

작성일: 2026-10-03
상태: 구현 직전 설계안. 실험 애플리케이션 코드는 아직 없다.
기준 커밋: `main` `2f43bcf` (PR #1 병합 시점)
입력 문서: `_research/06` ~ `_research/17`, `_research/sources.md`, `_research/02`, `_research/04`, `_research/05`

이 문서는 Agentic Clean Code 의 네 문장(찾기 쉽다, 좁게 고칠 수 있다, 바로 확인할 수 있다, 다음 작업을 망치지 않는다)을 같은 기능의 두 코드베이스로 비교하기 위한 구현 설계다.
구현 Agent 가 순서대로 따를 항목은 `_design/experiment-implementation-checklist.md` 에 따로 둔다.

---

# 1. 목적

실험이 답할 질문은 하나다.

> 사람이 리뷰하면 둘 다 받아들일 만한 코드인데, Coding Agent 가 탐색하고 수정하고 검증하고 병렬로 작업할 때 차이가 생기는가.

이 설계의 성공 조건은 B 가 이기는 것이 아니다. 다음 두 조건을 만족해야 한다.

- 실험 결과가 B 에 유리하게 나왔을 때 "처음부터 B 가 이기게 만든 실험" 이라는 반박에 차이 대장(§6.4)과 공정성 검사(§16)로 답할 수 있다
- 실험 결과가 A 에 유리하거나 차이가 없게 나왔을 때 그 결과를 그대로 기록하고 책의 주장을 좁힐 수 있다

---

# 2. 기존 연구에서 가져온 조건

## 2.1 그대로 가져온 조건

| 출처 | 조건 |
|---|---|
| `_research/13` §실험할 때 지켜야 할 것 | A 를 일부러 나쁘게 만들지 않는다. 기능 · API · 데이터는 같다. 구조 차이를 Agent 에게 알리지 않는다. 같은 모델 · 도구 · 설정. 반복 실행. 성공률 외 과정 지표 |
| `_research/14` §6 | A 만 복잡한 규칙, B 만 좋은 이름, B 만 많은 테스트, B 만 최신 framework, A 만 느린 build, 다른 instruction 을 금지한다 |
| `_research/14` §9 | B 를 먼저 만든 뒤 A 를 역설계하지 않는다. 과제 정답은 실험 저장소 밖에 둔다 |
| `_research/14` §11 | Agent 에게 실험 목적, A/B 구분, 예상 수정 파일, 정답 patch 를 주지 않는다 |
| `_research/15` §10 | 기대한 파일을 고치지 않았다는 이유만으로 실패로 판정하지 않는다 |
| `_research/15` §11, `_research/13` §성공 기준 | 결과가 반대로 나와도 기록한다 |
| `_research/16` §9 | B 도 최종 확인은 실제 애플리케이션에서 한다 |
| `_research/17` §8 | 결과를 하나의 점수로 합치지 않는다 |
| `_research/10` §3 | 중앙의 기준과 중앙의 수정 병목을 구분한다 |
| `_research/10` §4 | 자동 검사는 오래 유지할 약속만 대상으로 한다 |
| `_research/11` §9 기준 A | 사람에게 나빠지면 다시 생각한다 |

## 2.2 검토 후 바꾼 조건

기존 문서를 그대로 구현하면 공정성 반박을 버티지 못하는 지점이 네 군데 있었다.

**(1) A 의 규칙 분산은 기존 Clean Code 위반이다.**
`_research/12` 사례 1 은 A 에서 무료배송 규칙이 `OrderService`, `PromotionService`, `AdminOrderPreview`, `BatchInvoiceJob` 에 나뉘고 배치는 별도 계산식을 쓴다고 가정했다.
같은 업무 규칙을 두 곳에서 따로 계산하는 것은 DRY · SRP 위반이며 기존 Clean Code 리뷰에서 걸린다.
이 차이로 B 가 이기면 Agentic 원칙이 아니라 기존 원칙을 측정한 것이 된다.
→ 시작 시점에는 A 와 B 모두 규칙의 주인이 하나다. A 와 B 의 차이는 그 주인이 어디에 있고, 경계가 기계로 보호되는지에 둔다(§6.4 D1, D2).

**(2) B 에 버그 상태 story 를 미리 두면 정답을 준 것이다.**
`_research/12` 사례 4 와 `_research/14` §5.6 은 B 에 `LongDepartmentName` 상태가 이미 있다고 가정했다.
그 story 가 시각 기준 화면과 함께 있었다면 버그는 기준 화면을 만들 때 이미 드러났어야 한다. 앞뒤가 맞지 않는다.
→ B 에는 표준 상태(기본, 빈 목록, 오류, 로딩, 행 많음)와 상태를 만드는 fixture builder 만 둔다. 긴 부서명 상태는 Agent 가 직접 만들어야 한다. 측정 대상은 "새 상태를 만드는 비용" 이다.

**(3) Spring 에는 A 의 "중앙 API 등록 파일" 이 원래 없다.**
`_research/12` 사례 2 와 `_research/14` §7 은 A 에 `AdminApiRegistry` 를 두었다. Spring MVC 는 component scan 으로 Controller 를 등록하므로 정상적인 Spring 프로젝트에 이런 파일은 없다.
이 파일을 만들면 A 에 없는 병목을 일부러 넣는 것이다.
→ A 의 중앙 수정 지점은 실제 프로젝트에 흔한 frontend route 표 하나로 한정한다. 권한 기준(`Permission` enum, `SecurityConfig`)은 A 와 B 모두 중앙에 둔다(`_research/10` §3).

**(4) 연구 문서와 두 Variant 를 한 저장소에서 Agent 에게 보이면 실험이 오염된다.**
`_research/16` §2 는 연구 문서, A, B, 과제를 한 저장소에 두자고 했다. 작성용 저장소로는 맞지만 실험 Agent 가 그 저장소를 열면 `_research` 의 가설과 다른 Variant 를 읽을 수 있다.
→ 작성은 한 저장소(`lab/`)에서 하고, 실행용 저장소는 Variant 하나만 담아 별도로 내보낸다(§15.1).

## 2.3 기존 Clean Code 로 설명되는 부분과 아닌 부분

B 에 넣는 요소 대부분은 기존 설계 원칙으로 설명된다. 새 이름을 붙이지 않는다.

| B 요소 | 기존 개념 | Agent 사용 조건에서 달라지는 점 |
|---|---|---|
| 기능별 package | package-by-feature, 응집도 | 탐색 경로 길이로 측정할 수 있게 된다 |
| 공개 contract 와 `internal` | Parnas 의 정보 은닉 | 다른 Agent 가 내부를 읽지 않고 작업할 수 있는지로 측정한다 |
| 규칙의 주인 하나 | SRP, DRY | 시작 시점에는 A 도 같다. 차이 요소에서 제외한다 |
| 경계 자동 검사 | Architecture Fitness Function, ArchUnit | 문서를 읽지 않은 Agent 가 위반 즉시 실패 신호를 받는다 |
| 기능별 화면 등록 | 개방 · 폐쇄 원칙(OCP), plugin 구조 | 동시에 작업하는 Agent 수에 비례해 충돌 비용이 커진다. 이 부분이 Agent 조건에서 근거가 새로 생기는 곳이다 |
| UI 상태 fixture | Component-Driven Development, Storybook | 사람의 클릭 없이 Agent 가 상태를 만들 수 있는지로 측정한다 |
| 오류 코드에 기능 영역 표시 | 구조화 로그 | v0.1 실험에서는 측정하지 않는다(§13) |

책에서 주장할 수 있는 범위는 "새 원칙" 이 아니라 "Agent 가 실행 주체일 때 기존 원칙의 비용과 이익의 균형이 바뀌는가" 다.
이 실험도 그 질문에 맞춰 설계한다.

---

# 3. 기술 스택 결정과 이유

## 3.1 결정

| 영역 | 결정 | A/B |
|---|---|---|
| 언어 · 런타임 | Java 25 LTS | 동일 |
| Backend | Spring Boot 4.1.x, Spring MVC, Spring Security(session) | 동일 |
| 저장소 접근 | `JdbcClient` + 직접 작성한 SQL, H2 in-memory | 동일 |
| Build | Gradle wrapper, Kotlin DSL, 단일 module | 동일 |
| Backend 시험 | JUnit 5, AssertJ, `@WebMvcTest`, 일부 `@SpringBootTest`, ArchUnit 1.4.x | 동일(ArchUnit 규칙 내용만 다름) |
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query | 동일 |
| Frontend 시험 | Vitest(jsdom) + Testing Library, Playwright E2E | 동일 |
| UI 상태 재현 | Storybook(CSF) + Vitest browser mode(Playwright Chromium) | B 만. 차이 대장 D5 |
| Package manager | pnpm, lockfile 고정 | 동일 |
| Lint | ESLint, Prettier, Spotless(google-java-format) | 동일(경계 규칙 한 개만 B 에 추가) |

2026-10-03 기준 최신 버전은 Spring Boot 4.1.1(2026-08-20), Java 25(LTS, 2025-09-16), React 19.3.0, Vite 8.3.2, Vitest 5.0.3, Storybook 10.6.1, Playwright 1.63.0, ArchUnit 1.4.1, TypeScript 7.0.2 이다.
출처: https://endoflife.date/api/spring-boot.json , https://endoflife.date/api/oracle-jdk.json , npm registry `latest` 태그, Maven Central 검색.

버전 고정 규칙: **메이저 출시 후 6개월 이상 지난 메이저 중 최신 minor 를 쓴다.**
Agent 의 학습 자료에 충분히 들어간 버전이어야 framework 친숙도가 결과에 섞이지 않는다.
Spring Boot 4.x 는 2025-11 출시라 조건을 만족한다. TypeScript 7, Vitest 5, React Router 8 은 출시일을 확인하지 않았다 [확인 필요]. 조건을 만족하지 않으면 직전 메이저를 쓴다.
확정한 버전은 구현 체크리스트 0단계에서 lockfile 과 함께 고정한다.

## 3.2 평가

| 관점 | 판단 |
|---|---|
| 프로젝트 크기 | backend 운영 코드 60~90 파일, frontend 60~90 파일 규모를 목표로 한다. 사람이 diff 를 전부 검토할 수 있는 크기다 |
| build · test 속도 | JVM 과 Gradle daemon 시작 비용이 A/B 에 똑같이 들어간다. 전체 backend 시험 예상 30~60초, 단일 시험 클래스 예상 5~20초(warm daemon). 측정 후 확정 |
| Agent 친숙도 | Java/Spring 과 React/TypeScript 는 공개 코드가 가장 많은 조합에 속한다. JPA 대신 `JdbcClient` 를 고른 이유는 §3.3 |
| A/B 구조 표현 | 레이어 중심 package 와 기능 중심 package 를 Java package 로 그대로 표현할 수 있다. Spring 의 component scan 이 둘 다 같은 방식으로 동작한다 |
| architecture rule | ArchUnit 이 package 의존 · 순환 · 레이어 규칙을 시험 코드로 표현한다. 다른 언어의 dependency-cruiser, import-linter 와 대응되므로 책 독자가 옮겨 쓸 수 있다 |
| UI state fixture | Storybook CSF 가 Agent 와 사람 모두 익숙한 형식이다. Vitest browser mode 로 story 를 Chromium 에서 실행할 수 있다 |
| 병렬 실행 | Gradle 사용자 홈과 pnpm 의존성을 실행마다 분리해야 한다(§15). 컨테이너로 해결한다 |
| 반복 실험 비용 | 실행 비용은 대부분 모델 호출 비용이다. build 비용은 실행당 수 분 이내로 예상한다 |

## 3.3 검토한 대안

| 대안 | 채택하지 않은 이유 |
|---|---|
| TypeScript 단일 언어(NestJS 또는 Fastify + React) | 도구 체인이 하나라 시험이 빠르다. 그러나 이 책의 독자가 떠올리는 "정상적인 레이어 구조 업무 프로젝트" 는 Spring 쪽이 더 대표적이다. A 의 정상성을 독자가 판단하기 쉬운 쪽을 고른다 |
| Kotlin | Agent 친숙도와 독자 범위가 Java 보다 좁다 |
| Spring Data JPA | Agent 친숙도는 가장 높다. 그러나 지연 로딩, dirty checking, 영속성 컨텍스트가 실험 과제와 무관한 실패를 만들고 context 시작 시간을 늘린다 |
| Spring Modulith | 기능 module 검증을 코드 몇 줄로 해 주지만 module 의미를 framework 가 정한다. 책 독자가 다른 stack 으로 옮기기 어렵고, "B 만 특정 framework 기능을 쓴다" 는 반박을 받는다. 같은 규칙을 ArchUnit 3~4개로 직접 쓴다 |
| 외부 DB(PostgreSQL) | DB 준비 시간과 컨테이너 의존이 실험 결과에 섞인다. 과제 세 개 모두 DB 방언과 무관하다 |
| npm | 병렬 실행마다 `node_modules` 를 복사하는 비용이 크다. pnpm 은 content-addressable store 를 공유한다 |

기술 선택이 연구 주제가 되지 않도록 A 와 B 는 §6.4 차이 대장에 적은 것 외에는 같은 의존성과 같은 lockfile 을 쓴다.

---

# 4. A/B 공통 기능

## 4.1 업무 영역

요청에 있던 네 영역에 관리자 계정 영역(`staff`)을 더한다.
실험 3 의 "사용자 목록의 부서명" 은 쇼핑몰 회원이 아니라 관리자 계정에 있는 속성이다. 회원에 부서를 붙이면 업무 모델이 부자연스러워진다.

| 영역 | 기능 | 관리자 API |
|---|---|---|
| member | 회원 조회 · 상세, 상태 변경, 등급(GENERAL, VIP) 변경, 탈퇴 | `GET /api/admin/members`, `GET /api/admin/members/{id}`, `PATCH .../{id}/status`, `PATCH .../{id}/grade`, `POST .../{id}/withdraw` |
| order | 주문 생성(결제 전), 금액 미리보기, 조회, 상태, 결제 대기 30분 경과 시 만료 | `POST /api/orders/preview`, `POST /api/orders`, `GET /api/admin/orders`, `GET /api/admin/orders/{id}`, `POST /api/admin/orders/expire-overdue` |
| delivery | 배송비 계산, 무료배송 규칙, 배송 상태 | `GET /api/admin/deliveries`, `PATCH /api/admin/deliveries/{id}/status`, `GET /api/admin/delivery-policy` |
| refund | 환불 요청 · 승인 · 거절, 환불 가능 상태 확인, 부분 환불 시 배송비 재청구 | `POST /api/admin/refunds`, `POST .../{id}/approve`, `POST .../{id}/reject`, `GET /api/admin/refunds` |
| staff | 관리자 계정 조회 · 생성 · 역할 변경 · 비활성화 | `GET /api/admin/staff`, `POST /api/admin/staff`, `PATCH .../{id}/role`, `POST .../{id}/deactivate` |
| 인증 | 세션 로그인 · 로그아웃, 역할(ADMIN, OPERATOR)과 권한 | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |

## 4.2 업무 규칙(공통 명세)

- 기본 배송비 3,000원
- **VIP 회원이고 할인 후 상품 금액이 150,000원 이상이면 배송비 0원.** GENERAL 회원은 항상 3,000원
- 주문 시점의 배송비를 주문에 저장한다. 기준이 바뀌어도 기존 주문의 배송비는 바뀌지 않는다
- 부분 환불 후 남은 상품 금액이 무료배송 기준 미만이 되면 환불 금액에서 배송비 3,000원을 차감한다
- 환불 가능 주문 상태: `PAID`, `DELIVERED`. `SHIPPED`(배송 중) 상태는 환불 요청 불가
- 결제 대기(`PENDING_PAYMENT`) 주문은 생성 30분 후 `EXPIRED`. 시간은 주입한 `Clock` 으로 계산한다
- 권한은 영역별 `<AREA>_READ`, `<AREA>_WRITE`. ADMIN 은 전체, OPERATOR 는 READ 전체와 `DELIVERY_WRITE`
- 금액 음수 금지, 필수 ID 누락 시 400, 정의되지 않은 상태 값 400

## 4.3 공통 산출물(작성용 저장소 `lab/spec/`)

| 파일 | 내용 | 용도 |
|---|---|---|
| `requirements.md` | §4.1, §4.2 의 기능 명세 | A, B 구현의 유일한 기준 |
| `api.md` | endpoint, 요청 · 응답 JSON 예시, 오류 코드 목록 | API 동일성 확인 |
| `scenarios.md` | 행동 시나리오 목록. ID 형식 `DLV-03` | 시험 수 동일성 확인(§10) |
| `seed.sql` | 회원 40명, 주문 120건, 배송 100건, 환불 20건, 관리자 계정 12명 | 두 Variant 에 같은 바이트로 복사 |
| `ui.md` | 화면 목록, 열 구성, 메뉴 구성, 화면 폭 1280px 기준 | 화면 동일성 확인 |

seed 의 이름 · 부서명 길이는 20자 이하로 둔다. 실험 3 의 버그 상태가 기준 화면에 드러나지 않게 하기 위해서다.
seed 에는 실험 2 의 조회 화면 8개가 각각 1행 이상 보여 줄 데이터를 미리 넣는다. 실험 과제가 seed 를 바꿀 필요가 없게 한다.

## 4.4 화면

관리자 UI 화면 9개: 로그인, 회원 목록, 회원 상세, 주문 목록, 주문 상세, 배송 목록, 배송 정책, 환불 목록, 관리자 계정 목록.
모든 목록은 공통 `DataTable` component 를 쓴다. 메뉴는 영역 그룹(회원, 주문, 배송, 환불, 설정) 아래에 둔다.

---

# 5. Variant A 구조

## 5.1 성격

실무 팀이 Spring 과 React 로 관리자 시스템을 만들 때 흔히 고르는 레이어 중심 구조다.
"리뷰어가 이 PR 을 받아들이는가" 를 기준으로 만들고, 사람 리뷰어 한 명이 §16.3 체크리스트로 승인해야 다음 단계로 간다.

## 5.2 허용하는 특징

- backend 는 `controller`, `service`, `repository`, `domain`, `dto`, `config`, `common` 레이어 package
- frontend 는 `pages`, `components`, `api`, `types`, `hooks`
- frontend 의 route · 메뉴 · 화면 권한을 `src/app/adminRoutes.tsx` 한 표에서 관리한다
- 오류 코드는 `common/error/ErrorCode` enum 한 곳에 모은다
- UI 상태는 실제 앱 흐름으로 확인한다. jsdom component 시험은 있다
- 어느 service 든 다른 영역의 service 와 repository 를 주입받을 수 있다. 막는 규칙이 없다

## 5.3 불확실할 때 A 에 유리하게 정한 것

정상적인 선택지가 여러 개이면 A 에 유리한 쪽을 고른다. B 가 이겼을 때 반박의 여지를 줄이기 위해서다.

| 항목 | A 의 선택 | 덜 유리한 정상 선택지 |
|---|---|---|
| 업무 규칙 위치 | `DeliveryFeePolicy` 하나가 무료배송을 판단한다 | 주문 · 환불 service 가 각자 판단 |
| 구조 자동 검사 | ArchUnit 레이어 규칙 2개가 있다 | 자동 검사 없음 |
| 오류 응답 | 오류 코드와 메시지를 담은 JSON. B 와 같은 코드 문자열 | `500 Internal Server Error` 만 반환 |
| `SecurityConfig` | 영역 prefix 단위 규칙(`/api/admin/refunds/**`). 새 조회 API 가 이 파일을 고칠 필요가 없다 | endpoint 마다 규칙 추가 |
| route · 메뉴 | route 와 메뉴를 한 표에 둔다. 새 화면이 고치는 중앙 파일이 하나다 | route 파일과 메뉴 파일이 따로 있음 |
| E2E 보조 함수 | `login`, `createStaff`, `createOrder` 같은 API 보조 함수가 있다 | 화면을 클릭해 데이터 생성 |
| 시험 실행 안내 | README 에 `--tests` 필터 사용법이 있다 | 전체 시험 명령만 안내 |

## 5.4 하지 않는 것

긴 함수, 의미 없는 이름, 거대 클래스, 복사 붙여넣기, 순환 의존, 테스트 누락, 일부러 느린 build, 업무 규칙 숫자를 여러 곳에 적는 것.

---

# 6. Variant B 구조

## 6.1 만드는 방법

**B 는 완성된 A 를 차이 대장(§6.4)에 따라 재구성해서 만든다.**
업무 로직 메서드 본문은 옮기기만 하고 고치지 않는다. 바뀌는 줄은 다른 기능을 부르는 줄뿐이다. A 에서 `MemberService` 를 부르던 줄이 B 에서는 `MemberQuery` 를 부른다. 이렇게 하면 업무 로직과 이름의 동일성이 보장되고, A 를 B 에서 역설계하지 않는다는 조건(`_research/14` §9)도 지킨다.
B 가 "A 에 Agentic 원칙을 적용한 리팩토링 결과" 라는 점은 책의 서술 흐름과도 맞는다.

## 6.2 적용하는 원칙

- backend 는 `member`, `order`, `delivery`, `refund`, `staff`, `shared` 기능 package. 기능 package 의 최상위 타입이 공개 contract 이고 `internal` 하위 package 는 다른 기능이 쓰지 않는다
- frontend 는 `features/<영역>/<화면>/` 단위. 다른 기능은 `features/<영역>/index.ts` 로만 접근한다
- 화면 등록은 화면 디렉터리 안의 `admin-page.ts` 가 하고, 전체 목록은 `src/app/adminPages.ts` 가 build 시점에 모은다(§8.2)
- ArchUnit 경계 규칙 4개와 ESLint 경계 규칙 1개(§12)
- 목록 화면마다 표준 상태 story 와 fixture builder
- 오류 코드 enum 을 기능별로 둔다. 응답 JSON 은 A 와 같다

## 6.3 하지 않는 것

- 코드 생성기, 생성 파일 commit, annotation processor
- 기능마다 별도 Gradle module 또는 별도 배포 단위
- 기능마다 별도 controller 를 use case 단위로 쪼개기. 영역 단위 controller 는 A 와 같은 크기로 둔다
- B 에만 업무 동작 시험 추가
- README 에 "Agent 친화" 같은 실험 의도를 드러내는 문구

## 6.4 차이 대장

A 와 B 의 차이는 이 표에 있는 것뿐이다. 표에 없는 차이를 발견하면 버그로 보고 없앤다.
"분류" 열은 §2.3 에 따라 차이의 근거가 기존 원칙인지, Agent 조건에서 새로 생기는지를 적는다.

| ID | 영역 | A | B | 분류 | 주로 영향을 받는 실험 |
|---|---|---|---|---|---|
| D1 | backend package | 레이어별 | 기능별 + `internal` | 기존(응집도) | 1 |
| D2 | backend 경계 검사 | ArchUnit 레이어 규칙 2개 | ArchUnit 경계 규칙 4개, 기능별 공개 interface | 기존(정보 은닉, fitness function) | 1, 장기 실험 |
| D3 | frontend 디렉터리 | `pages`, `components`, `api`, `types` | `features/<영역>/<화면>`, `shared` | 기존(응집도) | 1, 3 |
| D4 | 화면 등록 | `src/app/adminRoutes.tsx` 한 표 | 화면별 `admin-page.ts` + glob 수집 | 기존(OCP) + 병렬 수정 비용 | 2 |
| D5 | UI 상태 재현 | jsdom component 시험, 실제 앱 E2E | 위와 같음 + 표준 상태 story, fixture builder, story 실행용 Vitest browser project | 기존 실무(CDD) + 사람 없는 재현 | 3 |
| D6 | 오류 코드 위치 · 로그 필드 | 중앙 enum, 로그에 코드 | 기능별 enum, 로그에 코드 · `feature` · `operation` | 기존(구조화 로그) | v0.1 측정 안 함 |
| D7 | 프론트 경계 lint | 없음 | `no-restricted-imports` 1개 | 기존(정보 은닉) | 2, 3 |

## 6.5 같아야 하는 것

언어 · framework · 라이브러리 버전과 lockfile, 업무 로직 메서드 본문, 도메인 클래스 이름과 메서드 시그니처, API 요청 · 응답, 오류 코드 문자열, 화면 렌더링 결과, seed, 행동 시나리오 ID 집합, lint · format 설정(D7 제외), README 절 구성, 명령 이름(`./gradlew test`, `pnpm test`, `pnpm e2e`), 공통 `DataTable` 구현.
이 중 기계로 확인할 수 있는 항목은 §16.2 의 동일성 검사로 확인한다.

---

# 7. 실제 directory · package 예시

대표 기능은 `delivery/free-shipping` 이다. 경로는 작성용 저장소 기준이며, 실행용 저장소로 내보내면 `lab/variants/a/` 가 저장소 루트가 된다.

## 7.1 작성용 저장소

```
lab/
  spec/            공통 명세, API, 시나리오 목록, seed, 화면 명세
  variants/
    a/             Variant A 저장소 루트 (backend/, frontend/, README.md)
    b/             Variant B 저장소 루트
  grading/         숨김 채점 시험. 실행용 저장소에 들어가지 않는다
  tasks/           과제 원문, 사전 등록 예측, 과제별 채점 기준
  harness/         내보내기, 컨테이너 이미지, 실행, 수집, 병합, 분석 스크립트
  results/         요약 결과. 원본 로그 보관 위치는 §19 [결정 필요]
```

## 7.2 Variant A backend

```
backend/src/main/java/com/example/shop/
  ShopApplication.java
  config/          SecurityConfig, ClockConfig, WebConfig
  common/
    error/         ErrorCode (enum, 전체 오류 코드), BusinessException, GlobalExceptionHandler, ErrorResponse
    money/         Money
  controller/
    AuthController, OrderController
    admin/         MemberAdminController, OrderAdminController, DeliveryAdminController,
                   RefundAdminController, StaffAdminController
  service/         MemberService, OrderService, OrderExpiryService, DeliveryService,
                   DeliveryFeePolicy, RefundService, StaffService
  repository/      MemberRepository, OrderRepository, DeliveryRepository, RefundRepository, StaffRepository
  domain/          Member, MemberGrade, MemberStatus, Order, OrderLine, OrderStatus, Delivery,
                   DeliveryStatus, Refund, RefundStatus, Staff, Role, Permission
  dto/
    member/ order/ delivery/ refund/ staff/   요청 · 응답 record
backend/src/main/resources/
  application.yml, schema.sql, seed.sql
backend/src/test/java/com/example/shop/
  service/         DeliveryFeePolicyTest, OrderServiceTest, RefundServiceTest, ...
  controller/admin/ DeliveryAdminControllerTest (@WebMvcTest), ...
  integration/     CheckoutFlowIT, RefundFlowIT (@SpringBootTest)
  architecture/    LayerRulesTest
```

## 7.3 Variant B backend

```
backend/src/main/java/com/example/shop/
  ShopApplication.java
  shared/
    config/        SecurityConfig, ClockConfig, WebConfig
    error/         ErrorCode (interface), BusinessException, GlobalExceptionHandler, ErrorResponse
    money/         Money
    security/      Role, Permission
  member/          MemberQuery (interface), MemberSummary, MemberGrade          ← 공개 contract
    internal/      MemberAdminController, MemberService, MemberRepository, Member, MemberStatus, MemberErrorCode
  order/           OrderQuery, OrderSummary, OrderStatus
    internal/      OrderController, OrderAdminController, OrderService, OrderExpiryService, OrderRepository, Order, OrderLine, OrderErrorCode
  delivery/        DeliveryFeeQuery, DeliveryFee
    internal/      DeliveryAdminController, DeliveryService, DeliveryFeePolicy, DeliveryFeeQueryService,
                   DeliveryRepository, Delivery, DeliveryStatus, DeliveryErrorCode
  refund/          (다른 기능이 쓰는 타입 없음)
    internal/      RefundAdminController, RefundService, RefundRepository, Refund, RefundStatus, RefundErrorCode
  staff/
    internal/      StaffAdminController, StaffService, StaffRepository, Staff, StaffErrorCode
  auth/
    internal/      AuthController, SessionUserService
backend/src/test/java/com/example/shop/
  delivery/internal/ DeliveryFeePolicyTest, DeliveryAdminControllerTest
  order/internal/    OrderServiceTest, ...
  refund/internal/   RefundServiceTest, ...
  integration/       CheckoutFlowIT, RefundFlowIT
  architecture/      ModuleBoundaryRulesTest
```

기능 사이 의존 방향(A 는 같은 방향이지만 검사하지 않는다):

```
order    → member (MemberQuery: 등급 조회), delivery (DeliveryFeeQuery)
refund   → order (OrderQuery), delivery (DeliveryFeeQuery), member (MemberQuery)
delivery → member (MemberGrade 타입만)
staff, auth → shared 만
```

## 7.4 대표 기능 파일 예시

업무 규칙 클래스는 A 와 B 가 같은 코드다. package 선언과 접근 제한자만 다르다.

```java
// A: com.example.shop.service.DeliveryFeePolicy
// B: com.example.shop.delivery.internal.DeliveryFeePolicy
@Component
public class DeliveryFeePolicy {

    static final Money BASE_FEE = Money.won(3_000);
    static final Money VIP_FREE_SHIPPING_THRESHOLD = Money.won(150_000);

    public Money feeFor(Money payableAmount, MemberGrade grade) {
        return isFreeShipping(payableAmount, grade) ? Money.ZERO : BASE_FEE;
    }

    public boolean isFreeShipping(Money payableAmount, MemberGrade grade) {
        return grade == MemberGrade.VIP && payableAmount.isGreaterThanOrEqual(VIP_FREE_SHIPPING_THRESHOLD);
    }

    public Money vipFreeShippingThreshold() {
        return VIP_FREE_SHIPPING_THRESHOLD;
    }
}
```

사용처의 차이:

```java
// A: com.example.shop.service.RefundService
private final DeliveryFeePolicy deliveryFeePolicy;      // 구현 클래스를 직접 주입
private final MemberService memberService;
...
boolean stillFree = deliveryFeePolicy.isFreeShipping(remainingAmount, memberService.gradeOf(order.memberId()));

// B: com.example.shop.refund.internal.RefundService
private final DeliveryFeeQuery deliveryFeeQuery;        // delivery 의 공개 interface
...
boolean stillFree = deliveryFeeQuery.isFreeShipping(remainingAmount, memberQuery.gradeOf(order.memberId()));
```

```java
// B 에만 있는 공개 contract (차이 대장 D2)
// com.example.shop.delivery.DeliveryFeeQuery
public interface DeliveryFeeQuery {
    Money feeFor(Money payableAmount, MemberGrade grade);
    boolean isFreeShipping(Money payableAmount, MemberGrade grade);
}
// delivery.internal.DeliveryFeeQueryService 가 DeliveryFeePolicy 에 위임한다
```

frontend 배송 정책 화면:

```
A: frontend/src/pages/delivery/DeliveryPolicyPage.tsx
   frontend/src/pages/delivery/DeliveryPolicyPage.test.tsx
   frontend/src/api/deliveryApi.ts
   frontend/src/types/delivery.ts
   frontend/src/app/adminRoutes.tsx            ← 화면 등록
B: frontend/src/features/delivery/delivery-policy/admin-page.ts
   frontend/src/features/delivery/delivery-policy/DeliveryPolicyPage.tsx
   frontend/src/features/delivery/delivery-policy/DeliveryPolicyView.tsx
   frontend/src/features/delivery/delivery-policy/DeliveryPolicyView.stories.tsx
   frontend/src/features/delivery/delivery-policy/DeliveryPolicyView.test.tsx
   frontend/src/features/delivery/api.ts, types.ts, fixtures.ts, index.ts
```

A 의 화면 컴포넌트도 데이터 조회(`DeliveryPolicyPage`)와 표시를 나눈다. 표시 컴포넌트 분리는 기존 원칙이라 A 와 B 가 같게 둔다. B 에서 다른 점은 표시 컴포넌트에 story 가 붙는 것이다.

## 7.5 Frontend 전체 구조

```
A: frontend/src/
     main.tsx
     app/         App.tsx, adminRoutes.tsx, Layout.tsx, Sidebar.tsx, RequirePermission.tsx
     pages/       member/ order/ delivery/ refund/ staff/ login/   (화면, 표시 컴포넌트, *.test.tsx)
     components/  DataTable.tsx, StatusBadge.tsx, MoneyText.tsx
     api/         client.ts, memberApi.ts, orderApi.ts, deliveryApi.ts, refundApi.ts, staffApi.ts
     types/       member.ts, order.ts, delivery.ts, refund.ts, staff.ts, permission.ts
     hooks/       useSession.ts
   frontend/e2e/  helpers/ (login, api 보조), *.spec.ts

B: frontend/src/
     main.tsx
     app/         App.tsx, adminPages.ts, Layout.tsx, Sidebar.tsx, RequirePermission.tsx
     shared/      ui/DataTable.tsx, ui/DataTable.stories.tsx, ui/StatusBadge.tsx, ui/MoneyText.tsx,
                  api/client.ts, permissions.ts, adminPage.ts(defineAdminPage, 타입), adminGroups.ts
     features/    member/ order/ delivery/ refund/ staff/ auth/
                    <영역>/index.ts, api.ts, types.ts, fixtures.ts
                    <영역>/<화면>/admin-page.ts, *Page.tsx, *View.tsx 또는 *Table.tsx, *.stories.tsx, *.test.tsx
   frontend/.storybook/
   frontend/e2e/  A 와 같은 내용
```

API client 파일은 A 와 B 모두 영역 단위 하나다(`api/deliveryApi.ts`, `features/delivery/api.ts`). 화면 단위로 쪼개면 실험 2 의 충돌이 D4 외의 이유로도 줄어 원인을 나눌 수 없다.

---

# 8. 세 가지 실험 상세 설계

공통 과제 문구 형식(두 Variant 동일):

```
다음 요청을 처리해 줘.

<과제 본문>

필요한 경우 시험을 실행해서 확인해. 코드를 바꿀 필요가 없다고 판단하면 이유를 말해 줘.
```

commit 은 Agent 에게 시키지 않는다. 실행이 끝나면 harness 가 작업 트리 상태로 diff 를 만든다.

## 8.1 실험 1. VIP 무료배송 기준 변경

과제 본문:

> VIP 회원 무료배송 기준을 150,000원에서 100,000원으로 변경하라.

이 과제에서 A/B 차이는 작을 것으로 예측한다. 시작 시점에는 두 Variant 모두 규칙의 주인이 하나이기 때문이다(§2.2 (1)).
그래도 첫 실험으로 두는 이유는 두 가지다.

- 측정 도구 보정: 차이가 작아야 할 과제에서 B 가 크게 이기면 harness 나 Variant 구현에 편향이 있다는 신호다
- package 구조만으로 생기는 탐색 차이와 기능 단위 검증의 위험(아래 B 의 "놓칠 수 있는 지점")을 측정한다

| 항목 | A | B |
|---|---|---|
| 처음 검색 예상 | `무료배송`, `FreeShipping`, `150_000`, `150000`, `VIP` 를 grep. `150_000` 은 `service/DeliveryFeePolicy.java`, `150000` 은 시험 파일과 frontend mock 에 걸린다 | 같은 검색어. 결과가 `delivery/` 아래에 모인다 |
| 관련 코드 위치 | `service/DeliveryFeePolicy`, 사용처 `service/OrderService`, `service/RefundService`, 노출 `controller/admin/DeliveryAdminController`, `dto/delivery/DeliveryPolicyResponse` | `delivery/internal/DeliveryFeePolicy`, 사용처는 `DeliveryFeeQuery` 를 통해 `order/internal/OrderService`, `refund/internal/RefundService` |
| 수정 후보(운영 코드) | `DeliveryFeePolicy.java` 상수 1줄 | `DeliveryFeePolicy.java` 상수 1줄 |
| 관련 시험 | `service/DeliveryFeePolicyTest`(경계값 149,999 · 150,000), `service/RefundServiceTest`(VIP 160,000원 주문에서 20,000원 부분 환불 시 배송비 차감), `controller/admin/DeliveryAdminControllerTest`(정책 응답), `pages/delivery/DeliveryPolicyPage.test.tsx`(mock 값) | `delivery/internal/DeliveryFeePolicyTest`, `refund/internal/RefundServiceTest`, `delivery/internal/DeliveryAdminControllerTest`, `features/delivery/delivery-policy/DeliveryPolicyView.test.tsx` · `fixtures.ts` |
| 놓칠 수 있는 지점 | `RefundServiceTest` 시나리오가 140,000원을 "기준 미만" 으로 쓰고 있어 기준 변경 후 실패한다. 시험 값을 고칠 때 시나리오 의도(기준 미만으로 떨어짐)를 유지해야 한다. frontend mock 의 150000 은 시험이 통과하므로 남을 수 있다 | A 와 같다. 추가로 `--tests 'com.example.shop.delivery.*'` 로 기능 단위만 실행하면 `refund` 시험 실패를 보지 못한다. **B 의 기능 단위 검증이 잘못된 확신을 줄 수 있는 지점이다** |
| 첫 빠른 검증 | `./gradlew test --tests '*DeliveryFeePolicyTest'` | `./gradlew test --tests 'com.example.shop.delivery.*'` |
| 최종 검증 | `./gradlew test`, `pnpm test`, `pnpm e2e` | 같음 + ArchUnit 은 `./gradlew test` 에 포함 |

숨김 채점(`lab/grading/tasks/exp1/`):

- VIP, 100,000원 → 배송비 0원. VIP, 99,999원 → 3,000원. GENERAL, 100,000원 → 3,000원
- `GET /api/admin/delivery-policy` 의 기준 값 100000
- VIP 120,000원 주문에서 30,000원 부분 환불 → 남은 금액 90,000원 → 배송비 3,000원 차감
- VIP 120,000원 주문에서 10,000원 부분 환불 → 남은 금액 110,000원 → 차감 없음
- seed 에 있는 기존 주문의 저장된 배송비가 그대로인지
- Variant 자체 시험 전체 통과

사전 등록 예측: 성공률은 두 Variant 모두 높고 차이가 없다. B 의 열어 본 디렉터리 수가 적다. 첫 검증까지 시간은 차이가 없다. B 에서 기능 단위 검증 후 전체 시험 전에 완료를 선언하는 실행이 A 보다 많을 수 있다.

## 8.2 실험 2. 관리자 기능 8개 병렬 추가

### 과제

영역마다 2개씩, 같은 영역 쌍이 생기게 배정한다. 같은 영역의 두 작업은 A 와 B 모두 같은 controller · repository · API client 를 고치므로 충돌한다. 이 충돌은 D4 와 무관한 기준선이다.

| ID | 화면 | API | 권한 |
|---|---|---|---|
| T2-M1 | 휴면 회원(마지막 로그인 365일 경과) | `GET /api/admin/members/dormant` | `MEMBER_READ` |
| T2-M2 | 최근 30일 탈퇴 회원 | `GET /api/admin/members/withdrawn` | `MEMBER_READ` |
| T2-O1 | 10분 안에 만료될 결제 대기 주문 | `GET /api/admin/orders/expiring` | `ORDER_READ` |
| T2-O2 | 결제 금액 500,000원 이상 주문 | `GET /api/admin/orders/high-value` | `ORDER_READ` |
| T2-D1 | 출고 후 3일 넘게 도착하지 않은 배송 | `GET /api/admin/deliveries/delayed` | `DELIVERY_READ` |
| T2-D2 | 무료배송 적용 배송 | `GET /api/admin/deliveries/free-shipping` | `DELIVERY_READ` |
| T2-R1 | 요청 후 2일 넘게 처리되지 않은 환불 | `GET /api/admin/refunds/stale` | `REFUND_READ` |
| T2-R2 | 부분 환불 목록 | `GET /api/admin/refunds/partial` | `REFUND_READ` |

과제 본문에는 화면 이름, API 경로, 표시 열, 조건, 메뉴 그룹 · 이름, 권한을 적는다. 숨김 채점이 같은 경로를 호출해야 하기 때문이다. 두 Variant 에 같은 문구를 준다.
모든 과제는 기존 테이블만 읽는다. 스키마 변경과 새 권한은 v0.1 범위 밖이다(§17).

### 예상 수정 파일

| 구분 | A | B |
|---|---|---|
| 모든 작업이 고치는 파일 | `frontend/src/app/adminRoutes.tsx` | 없음 |
| 같은 영역 작업끼리 고치는 파일 | `<Area>AdminController`, `<Area>Service`, `<Area>Repository`, `api/<area>Api.ts`, `types/<area>.ts` | `internal/<Area>AdminController`, `internal/<Area>Service`, `internal/<Area>Repository`, `features/<area>/api.ts`, `features/<area>/types.ts` |
| 새 파일 | 화면, 표시 컴포넌트, 시험, dto | 화면 디렉터리(`admin-page.ts`, 화면, 표시 컴포넌트, story, 시험) |

사전 등록 예측: A 는 28개 작업 쌍 중 `adminRoutes.tsx` 에서 충돌하는 쌍이 많다. 같은 영역 쌍 4개는 A 와 B 모두 backend 파일에서 충돌한다. B 의 충돌은 같은 영역 쌍으로 한정된다. 실제 충돌 수는 git 의 3-way merge 가 인접한 hunk 를 어떻게 처리하는지에 따라 달라지므로 수치는 예측하지 않는다.

### B 의 자동 등록 방식

```ts
// B: frontend/src/features/refund/stale-refunds/admin-page.ts
import { defineAdminPage } from '@/shared/adminPage';

export const adminPage = defineAdminPage({
  id: 'refund.stale',
  path: '/refunds/stale',
  group: 'refund',
  label: '처리 지연 환불',
  permission: 'REFUND_READ',
  component: () => import('./StaleRefundsPage'),
});
```

```ts
// B: frontend/src/app/adminPages.ts (전체 목록을 모으는 유일한 위치)
// features/<영역>/<화면>/admin-page.ts 를 모두 읽는다. 화면을 추가해도 이 파일은 고치지 않는다.
const modules = import.meta.glob<{ adminPage: AdminPage }>(
  '../features/*/*/admin-page.ts',
  { eager: true },
);
export const adminPages = sortByGroupAndLabel(Object.values(modules).map((m) => m.adminPage));
```

```tsx
// A: frontend/src/app/adminRoutes.tsx 의 한 항목
{ path: '/refunds/stale', group: 'refund', label: '처리 지연 환불',
  permission: 'REFUND_READ', element: lazy(() => import('../pages/refund/StaleRefundsPage')) },
```

검토 결과:

| 질문 | 판단 |
|---|---|
| 너무 마술적인가 | `import.meta.glob` 은 Vite 공식 기능이고 수집 코드는 한 파일 약 30줄이다. 파일 첫 줄 주석에 수집 대상 경로를 적는다. backend 의 Spring component scan 도 같은 성격의 자동 등록이며 A 도 이미 쓰고 있다 |
| compile-time · static 확인 | `defineAdminPage` 의 인자 타입과 `Permission` union 타입은 `tsc` 가 각 파일에서 확인한다. 경로 · id 중복과 등록 누락(화면 디렉터리에 `admin-page.ts` 가 없음)은 compile 단계에서 잡히지 않아 `adminPages.test.ts` 가 시험 단계에서 잡는다 |
| 사람이 전체 구조를 보기 어려운가 | 전체 표를 파일 하나로 읽을 수 없다는 비용이 있다. `pnpm admin-pages` 가 경로 · 메뉴 · 권한 · 원본 파일 표를 출력하고, `grep -r "defineAdminPage(" src/features` 로도 목록을 얻는다. 이 비용은 사람 리뷰 항목(§16.3)에 넣는다 |
| generator 유지보수 부담 | 생성 파일과 생성 스크립트가 없다. 유지할 코드는 수집 함수, 정렬 함수, 검증 시험이다. 출력용 `pnpm admin-pages` 스크립트는 수집 함수를 그대로 쓴다 |
| IDE · 검색 | 경로 문자열 `'/refunds/stale'` 과 화면 컴포넌트 import 가 같은 파일에 있어 검색 한 번에 찾는다. "메뉴는 어디서 만들어지나" 는 `adminPages.ts` 에서 끊기므로 첫 줄 주석으로 안내한다 |
| 의미 충돌 | 메뉴 순서를 숫자로 지정하게 하면 두 Agent 가 같은 숫자를 고를 수 있다. 그룹 순서는 `shared/adminGroups.ts` 에 고정하고, 그룹 안은 label 가나다순으로 정렬한다. 경로 중복은 시험이 잡는다 |
| 중앙에 남기는 것 | `Permission` 목록, 역할별 권한, 메뉴 그룹 순서는 B 도 중앙에 둔다. 보안 기준과 전체 구조 기준이기 때문이다(`_research/10` §3). 실험 2 과제는 이 파일들을 고칠 필요가 없게 정했다 |

"중앙 파일이 없으니 B 가 좋다" 로 결론 내지 않는다. 결과 해석에서 다음 비용을 같이 기록한다.

- B 에서 등록 누락 · 경로 중복이 merge 후 시험에서만 드러난 횟수
- 사람 리뷰어가 전체 메뉴 구조를 파악하는 데 걸린 시간(§16.3)
- 기능이 4개뿐일 때는 A 의 표 하나가 더 단순하다는 점. `_research/12` 사례 2 의 판단을 유지한다

### 병합과 측정

1. 같은 기준 commit 에서 8개 실행을 동시에 시작한다. 실행마다 별도 컨테이너와 별도 clone 을 쓴다(§15)
2. 실행이 끝나면 harness 가 각 결과를 branch `task/<ID>` 로 commit 한다
3. **쌍별 충돌**: 28개 쌍마다 기준 commit 에서 두 branch 를 3-way merge 해 충돌 파일과 hunk 수를 기록한다. 병합 순서에 영향을 받지 않는 지표다(`_research/sources.md` L1 과 같은 방식)
4. **순차 통합**: ID 사전순으로 통합 branch 에 병합한다. 충돌이 나면 통합 Agent(같은 모델, 고정 문구 "충돌을 해결하고 시험을 통과시켜라")가 해결한다. 병합마다 `./gradlew test`, `pnpm test`, `pnpm e2e` 를 실행한다
5. 마지막에 숨김 채점 8개를 전부 실행한다

숨김 채점: 각 API 가 seed 에 대해 기대 행을 반환하는지, 메뉴에 이름이 보이고 화면이 열리는지, 권한 없는 계정이 403 을 받고 메뉴가 보이지 않는지.

## 8.3 실험 3. 긴 부서명 UI 문제

과제 본문:

> 관리자 계정 목록에서 부서명이 80자 이상일 때 오른쪽 액션 버튼이 밀려난다. 고쳐 줘.

### 버그의 원인(두 Variant 동일)

공통 `DataTable` 의 셀 스타일이 `white-space: nowrap` 이고 표 컨테이너가 `overflow-x: auto` 다. 긴 부서명이 표 폭을 넓혀 1280px 화면에서 액션 열(수정, 비활성화)이 가로 스크롤 밖으로 밀려난다.
고칠 수 있는 위치는 세 가지다. `DataTable` 의 열 정의에 말줄임 옵션을 두는 방법, 관리자 계정 표의 열 폭만 고치는 방법, `nowrap` 을 전체에서 없애는 방법. 셋 다 채점을 통과할 수 있고, 위치는 사람 검토에서 기록만 한다(`_research/15` §10).

### 재현 경로

목표는 "브라우저 없이" 가 아니다. **사람이 애플리케이션을 직접 조작하지 않고 Agent 가 문제 상태를 만들고 검증할 수 있는가** 다. 두 Variant 모두 Playwright Chromium 이 설치돼 있다.

| 단계 | A | B |
|---|---|---|
| 상태 만들기 | backend 실행(`./gradlew bootRun`), frontend 실행(`pnpm dev`), E2E 보조 함수나 API 로 80자 부서명 계정 생성, 로그인, `/staff` 이동 | `StaffTable.stories.tsx` 에 `staffFixture({ department: ... })` 로 story 를 하나 추가 |
| 화면 확인 | Playwright 스크립트나 E2E 시험을 작성해 screenshot 또는 버튼 위치 측정 | `pnpm test:stories StaffTable` 로 Chromium 에서 story 실행, screenshot 또는 위치 측정 |
| backend 필요 여부 | 필요 | 불필요 |
| 최종 확인 | `pnpm e2e` | story 시험 + `pnpm e2e`. 실제 앱에서도 확인해야 완료로 본다 |

jsdom 시험은 layout 을 계산하지 않으므로 두 Variant 모두 이 버그를 jsdom 으로 재현할 수 없다. 이 사실은 두 Variant 에 같다.

### B 에 미리 있는 것과 없는 것

- 있음: `StaffTable` 의 `Default`, `Empty`, `Loading`, `Error`, `ManyRows` story, `staffFixture()` builder, story 실행용 Vitest browser project 설정
- 없음: 긴 부서명 story, 위치 측정 helper, 이 버그를 겨냥한 시각 기준 화면

### 숨김 채점

- API 로 부서명 80자, 120자 계정을 만든 뒤 1280×800, 1024×768 에서 `/staff` 를 연다
- 모든 행의 액션 버튼 bounding box 가 표 컨테이너와 viewport 안에 있다
- 표 컨테이너에 가로 스크롤이 생기지 않는다
- 부서명 전체 문자열을 화면 텍스트나 `title` 속성으로 확인할 수 있다
- 다른 목록 화면 4개의 seed 기준 screenshot 이 기준 화면과 같다

사전 등록 예측: B 가 첫 재현까지 명령 수와 시간이 적다. 성공률은 차이가 작다. A 에서 재현 없이 CSS 를 먼저 고치는 실행이 더 많다.

---

# 9. 공통 acceptance test

`lab/grading/` 은 숨김 채점이다. 실행용 저장소에 넣지 않는다.

| 구분 | 내용 | 도구 |
|---|---|---|
| 기본 동작 | §4.2 의 규칙, 상태 전이, 권한, 입력 검증. 시나리오 ID 별 1개 이상 | Playwright `request`(HTTP) |
| 화면 | 화면 9개 진입, 목록 열 구성, 메뉴 권한별 노출 | Playwright browser |
| 과제별 채점 | `grading/tasks/exp1`, `exp2/<ID>`, `exp3` | Playwright |
| 동일성 검사 | §16.2 의 API 응답 비교, 화면 screenshot 비교 | 스크립트 |

실행 방식: Variant 의 backend jar 를 빌드하고 frontend `dist/` 를 Spring 정적 자원 경로로 지정해 한 port 로 띄운 뒤 채점 시험을 실행한다.
A 와 B 의 기준 commit 에서 채점 시험이 모두 통과해야 실험을 시작한다. 한쪽만 실패하면 구조 비교 전에 기능 차이를 고친다(`_research/16` §7).

Agent 가 보는 시험은 각 Variant 안의 시험(§10)뿐이다. 숨김 채점은 "완료 선언 후 숨김 시험 실패"(`_research/14` §13)를 측정하는 데 쓴다.

---

# 10. Variant 별 내부 시험

## 10.1 시험 수 동일 규칙

- `lab/spec/scenarios.md` 의 시나리오 ID 마다 두 Variant 에 같은 입력 값으로 같은 단계의 시험이 하나씩 있다
- 시험 이름에 ID 를 넣는다. 예: `@DisplayName("[DLV-03] VIP 150,000원 이상은 무료배송")`
- 스크립트가 두 Variant 의 ID 집합을 비교해 같아야 통과한다(§16.2)
- 시나리오에 속하지 않는 시험은 구조 시험으로 따로 센다

| 구분 | A | B |
|---|---|---|
| 업무 단위 시험(Spring 없음) | 시나리오 ID 별 | 같은 ID, 같은 값 |
| web slice 시험(`@WebMvcTest`) | 영역별 | 같은 ID |
| 통합 시험(`@SpringBootTest`) | 2개(주문 흐름, 환불 흐름) | 같은 2개 |
| frontend component 시험(jsdom) | 화면 · 표시 컴포넌트별 | 같은 ID. 렌더링 대상이 story 인지 inline 데이터인지만 다르다 |
| E2E | `E2E-01` ~ | 같은 ID |
| 구조 시험 | ArchUnit 레이어 규칙 2개 | ArchUnit 경계 규칙 4개, ESLint 경계 규칙, `adminPages.test.ts` |
| story 실행 | 없음 | 표준 상태 story(목록 화면 5개 × 5개 상태 예상) |

story 실행과 구조 시험은 B 의 처리 요소이므로 차이 대장에 들어 있다. 결과 보고에는 시험 수를 이 표의 구분별로 따로 적는다.

## 10.2 검증 단계

| 단계 | 검사 대상 | 명령 예(A / B) | 예상 시간 | 실패 시 Agent 가 얻는 정보 |
|---|---|---|---|---|
| 1. 수정한 곳 | 고친 규칙의 단위 시험 | `./gradlew test --tests '*DeliveryFeePolicyTest'` / 같음, `pnpm vitest run <파일>` | backend 5~20초(warm daemon), frontend 2~5초 | 시나리오 ID, 기대값과 실제값 |
| 2. 기능 전체 | 한 영역의 단위 · slice 시험, story 실행 | `--tests '*Delivery*'` / `--tests 'com.example.shop.delivery.*'`, `pnpm test:stories delivery` | 10~30초 | 같은 영역의 다른 시나리오 실패 |
| 3. 연결된 기능 | backend 전체 단위 · slice · 구조 시험, frontend 전체 jsdom 시험 | `./gradlew test`, `pnpm test` | 30~90초 | 다른 영역 시나리오 실패, 구조 규칙 위반(위반 클래스와 규칙 이름) |
| 4. 공통 acceptance | 실제 앱을 띄운 E2E | `pnpm e2e` | 1~3분 | 화면 · API 단위 실패, Playwright trace |
| 5. 전체 regression | 1~4 전부 + 시각 비교 | `./scripts/verify-all.sh`(두 Variant 동일 이름) | 3~5분 | 위 전부 |

예상 시간은 추정이다. 구현 후 같은 기계에서 10회 측정해 중앙값으로 바꾼다.
이 코드베이스는 작아서 3단계도 1분 안팎으로 예상한다. 따라서 backend 의 "바로 확인" 차이는 작게 나올 가능성이 높다. 이것은 알려진 한계로 기록한다(§17).

2단계 기능 필터의 위험: B 의 package 필터는 다른 기능의 시험을 빼므로, 실험 1 처럼 다른 기능이 규칙을 쓰면 실패를 놓친다. README 의 검증 안내는 두 Variant 모두 "완료 전 `./gradlew test` 와 `pnpm test` 실행" 을 같은 문장으로 적는다.

---

# 11. UI 상태 재현 방식

## 11.1 B

- 목록 표시 컴포넌트(`MemberTable`, `OrderTable`, `DeliveryTable`, `RefundTable`, `StaffTable`)마다 `Default`, `Empty`, `Loading`, `Error`, `ManyRows` story
- 영역별 `fixtures.ts` 에 `staffFixture(overrides)`, `staffListFixture(count, overrides)` 같은 builder. seed 와 같은 값 규칙을 쓴다
- `pnpm test:stories [필터]` 가 Vitest browser mode(Playwright Chromium)로 story 를 렌더링하고 오류 없이 그려지는지 확인한다
- 시각 기준 화면은 `toMatchScreenshot` 로 표준 상태만 저장한다. Vitest 문서는 렌더링 결과가 OS · GPU · 글꼴에 따라 달라진다고 경고하고 통제된 컨테이너 실행을 권한다(https://vitest.dev/guide/browser/visual-regression-testing). 기준 화면은 실험 컨테이너 이미지에서만 만든다
- Storybook 화면(`pnpm storybook`)은 사람이 상태를 둘러보는 용도다. 시험은 Storybook 서버 없이 실행된다

## 11.2 A

- 표시 컴포넌트의 jsdom 시험이 시나리오 ID 별로 있다
- 실제 앱 E2E 와 보조 함수(`e2e/helpers/session.ts` 의 `login`, `e2e/helpers/api.ts` 의 `createStaff`)가 있다
- 새 상태를 보려면 앱을 띄우고 데이터를 만들고 화면에 들어가야 한다

## 11.3 두 Variant 공통

- Playwright Chromium, 고정 글꼴, 고정 viewport, `TZ=Asia/Seoul`, `LANG=ko_KR.UTF-8`
- E2E 의 port 는 환경 변수(`APP_PORT`)로 받고 `reuseExistingServer: false` 로 다른 실행의 서버에 붙지 않는다
- Agent 는 `Read` 도구로 PNG screenshot 을 볼 수 있다. 두 Variant 에 같은 조건이다

---

# 12. Architecture rule

## 12.1 B 에 넣는 규칙

| ID | 규칙 | 도구 | 유지 근거 |
|---|---|---|---|
| R1 | 다른 기능의 `..<기능>.internal..` 클래스를 참조하지 않는다 | ArchUnit | 정보 은닉의 경계. 이것이 깨지면 공개 contract 가 의미를 잃는다 |
| R2 | 기능 package 사이에 순환 의존이 없다 | ArchUnit `slices().matching("com.example.shop.(*)..").should().beFreeOfCycles()` | 순환이 생기면 기능 단위 수정 · 검증이 불가능해진다 |
| R3 | `shared` 는 기능 package 를 참조하지 않는다 | ArchUnit | `shared` 가 모든 기능에 의존하는 공용 저장소가 되는 것을 막는다 |
| R4 | 기능 사이 의존은 §7.3 의 허용 방향만 따른다 | ArchUnit, 허용 표를 시험 코드 한 곳에 둔다 | 새 의존이 생기면 의도한 변경인지 사람이 판단하게 한다 |
| R5 | frontend 에서 다른 기능은 `@/features/<영역>` 의 `index.ts` 로만 import 한다 | ESLint `no-restricted-imports` | R1 의 frontend 판. 다른 기능 내부 상태 · 컴포넌트 직접 참조도 이 규칙으로 막힌다 |

R4 는 의존이 바뀔 때마다 허용 표를 고쳐야 한다. 표가 중앙 수정 지점이 되는 비용이 있다. 기능 사이 의존 추가는 드물고 리뷰가 필요한 변경이므로 유지한다. 실험 2 과제는 새 기능 사이 의존을 만들지 않는다.

## 12.2 A 에 넣는 규칙

| ID | 규칙 |
|---|---|
| L1 | `controller` 는 `repository` 를 참조하지 않는다 |
| L2 | `service` · `repository` · `domain` 은 `controller` · `dto` 를 참조하지 않는다 |

A 도 자기 구조의 약속을 기계로 검사한다. A 와 B 의 차이는 검사 유무가 아니라 검사 대상(레이어 대 기능 경계)이다.

## 12.3 넣지 않는 규칙

| 후보 | 제외 이유 |
|---|---|
| 클래스 이름 접미사, 파일 길이, 함수 길이 | 취향이고 정상적인 리팩토링을 막는다(`_research/10` §4) |
| "무료배송 판단은 `DeliveryFeePolicy` 밖에서 하지 않는다" | 판단 여부를 정적으로 정확히 구분할 수 없다. `isFreeShipping` 호출 위치만 세는 규칙은 우회가 쉽고 오탐이 생긴다 |
| 기능 내부 레이어 규칙(`internal` 안의 controller → repository) | A 의 L1 과 같은 내용이다. B 에 넣으면 B 의 규칙 수만 늘어난다. 넣는다면 A 와 같은 내용으로 양쪽에 넣는다 |
| frontend 순환 의존 | 관리자 화면 기능끼리 서로 import 할 이유가 적다. 실행 비용 대비 효과가 낮다 |
| 화면마다 story 필수 | 시험 수를 늘리는 규칙이며 오래 유지할 약속이 아니다 |

---

# 13. 오류 · 로그 전략

API 응답은 두 Variant 가 같다.

```json
{ "code": "REFUND_STATE_INVALID", "message": "배송 중인 주문은 환불을 요청할 수 없습니다." }
```

| 항목 | A | B |
|---|---|---|
| 오류 코드 정의 위치 | `common/error/ErrorCode` enum 하나 | 기능별 enum(`RefundErrorCode` 등)이 `shared/error/ErrorCode` interface 구현 |
| 업무 오류 로그 | WARN, `code`, 메시지 | WARN, `code`, `feature`, `operation`(예: `refund.request`), 메시지 |
| 시스템 오류 | ERROR, stack trace | 같음 |
| 민감 정보 | 이메일 · 이름 · 세션 값을 로그에 남기지 않는다 | 같음 |
| 시험 실패 메시지 | AssertJ 기본 메시지 + 시나리오 ID | 같음 |

v0.1 의 세 실험에서 오류 로그는 결과에 큰 영향을 주지 않을 것으로 예상한다. 이 차이(D6)는 이후 환불 실패 진단 실험(`_research/12` 사례 6)에서 측정한다.
A 의 중앙 `ErrorCode` enum 은 새 오류 코드를 만드는 작업에서 공통 수정 지점이 된다. 실험 2 과제는 새 오류 코드를 만들지 않는다.

---

# 14. 측정 방법

## 14.1 원칙

Agent 의 자연어 보고는 측정에 쓰지 않는다. 도구 호출 기록, 명령 기록, git diff, 시험 산출물만 쓴다.
지표 계산 스크립트는 실험 시작 전에 고정하고 commit 한다. 계산 중에 Variant 이름을 쓰지 않고 실행 ID 만 쓴다.

## 14.2 Claude Code 에서 얻는 기록

2026-10-03 에 Claude Code 2.1.287 과 공식 문서로 확인한 내용이다.

| 기록 | 얻는 방법 | 담긴 정보 | 근거 |
|---|---|---|---|
| 이벤트 stream | `claude -p --output-format stream-json --verbose --include-hook-events` | 도구 호출(`tool_use` 이름 · 입력), 도구 결과, 마지막 `result` 의 소요 시간 · turn 수 · 비용 · token | `claude --help` |
| 세션 기록 | `$CLAUDE_CONFIG_DIR/projects/<경로>/<session-id>.jsonl` | 항목별 `timestamp`, `tool_use` 입력, `toolUseResult`(Bash 는 `stdout`, `stderr`, `interrupted`), 실패한 Bash 결과의 `Exit code N` | 로컬 세션 기록 확인 |
| hook 기록 | `PreToolUse`, `PostToolUse` hook 이 입력 JSON 을 파일에 추가 | `tool_use_id`, `tool_name`, `tool_input`, `tool_response`(Bash 의 `exit_code` 포함). 입력에 timestamp 필드는 없으므로 hook 이 기록 시각을 붙인다 | https://code.claude.com/docs/en/hooks |
| 세션 ID 고정 | `--session-id <uuid>` | 실행 ID 와 세션 기록 연결 | `claude --help` |

hook 은 기록만 하고 출력과 결정을 내지 않는다. hook 설정은 harness 가 `--settings` 로 넘기며 실행용 저장소에 없다.

## 14.3 시험 산출물 수집

- `PostToolUse` hook 이 Bash 명령을 시험 명령 패턴(`gradlew .*test`, `vitest`, `pnpm (test|e2e|test:stories)`, `playwright test`)으로 판정하면 `backend/build/test-results/`, `frontend/test-results/`, `frontend/reports/junit*.xml` 중 그 명령의 `PreToolUse` 기록 시각 이후 수정된 파일만 `artifacts/test-<순번>/` 으로 복사한다. Gradle 은 이번에 실행하지 않은 시험 클래스의 이전 XML 을 지우지 않으므로, 시각으로 거르지 않으면 이전 결과를 이번 결과로 잘못 센다
- Vitest · Playwright 의 JUnit reporter 는 두 Variant 설정에 같게 넣는다
- 실행 종료 후 harness 가 5단계 전체 검증을 따로 실행하고 시간을 잰다. Agent 의 실행 시간과 섞지 않는다

## 14.4 지표 정의

| 지표 | 계산 |
|---|---|
| 읽은 파일 수 | `Read` 도구의 서로 다른 경로 수 + Bash 의 `cat`, `sed -n`, `head`, `tail`, `less` 가 연 파일 경로 수. 두 값을 따로 보고한다 |
| 검색 횟수 | `Grep`, `Glob` 호출 수 + Bash 첫 프로그램이 `grep`, `rg`, `find`, `fd`, `git grep`, `ls -R` 인 명령 수 |
| 첫 관련 영역 도달 | 최종 diff 의 운영 코드 파일(또는 그 파일이 속한 기능 디렉터리)을 처음 읽은 시점까지의 도구 호출 수와 시간. 정답 파일을 미리 고정하지 않고 실행 후 diff 로 정한다(`_research/17` §2) |
| 수정 파일 수 | 기준 commit 대비 `git diff --name-status` + 추적되지 않은 새 파일. build 산출물 제외 |
| 되돌린 수정 | 실행 중 `Edit` · `Write` 대상이었지만 최종 diff 에 없는 파일 수 |
| 공통 파일 수정 | Variant 별로 사전 등록한 공통 경로 목록(A: `src/app/**`, `common/**`, `config/**`, build 파일 / B: `src/app/**`, `shared/**`, build 파일)에 속한 변경 |
| 첫 신뢰 가능한 시험 시간 | 실행 시작부터, 첫 운영 코드 수정 이후 실행된 시험 명령 중 JUnit XML 에 시험 1개 이상이 기록된 첫 명령이 끝난 시점까지. compile 오류로 시험이 실행되지 않은 명령은 제외 |
| 전체 시험 시간 | harness 가 실행 후 따로 잰 5단계 검증 시간 |
| 재시도 횟수 | 첫 실패 시험 명령 이후 첫 성공까지 실행한 시험 명령 수. 수정 없이 같은 명령을 다시 실행한 횟수는 따로 센다 |
| merge conflict | 실험 2 의 28쌍 3-way merge 결과. 충돌 쌍 수, 충돌 파일, hunk 수 |
| merge 후 시험 실패 | 실험 2 순차 통합에서 병합마다 실행한 검증의 실패 수와 실패 시험 ID |
| 요청 범위를 넘은 변경 | 자동 표시(과제 영역 밖 파일, build · lock 파일, 삭제 파일, seed 변경)와 사람 검토 판정을 따로 기록한다. 자동 표시는 판정이 아니다 |
| 숨김 채점 | 과제별 채점 통과 여부, 실패 항목 |
| 최종 diff | `final.patch` 원문 보관 |
| 비용 | `result` 의 token · 비용 · turn 수 |

## 14.5 실행 기록 형식

실행마다 `results/<run-id>/` 에 다음을 둔다.

```
run.json          실행 ID, 날짜, 과제, Variant 코드(가림), 기준 commit, Claude Code 버전, 모델, effort,
                  도구 목록, 시간 제한, 예산 제한, 컨테이너 이미지 digest
stream.jsonl      stream-json 원본. 각 줄에 수신 시각을 붙인다
transcript.jsonl  세션 기록 원본
hooks.jsonl       hook 기록
artifacts/        시험 산출물 순번별 복사본
final.patch       최종 diff
verify.json       harness 의 5단계 검증 결과와 시간
grading.json      숨김 채점 결과
metrics.json      §14.4 지표 계산 결과
review.json       사람 검토 결과
```

## 14.6 반복과 순서

- 첫 실행은 harness 확인용 pilot 이다. 결과에 넣지 않는다
- 실험 1, 3: Variant 당 5회. A/B 실행 순서는 무작위로 섞는다. 시간 지표 때문에 동시에 실행하지 않는다
- 실험 2: Variant 당 3회(1회 = 8개 동시 실행). 결과 변동이 크면 반복을 늘린다
- 실행당 시간 제한 45분, 예산 제한은 §19 [결정 필요]
- 세션 수 합계: 실험 1 10회, 실험 3 10회, 실험 2 48회와 통합 Agent 실행

## 14.7 사람 검토

- 검토자 2명이 `final.patch` 를 `_research/14` §12 의 질문으로 판정한다
- 경로 이름으로 Variant 를 알 수 있으므로 완전한 맹검은 불가능하다. 실행 ID 만 보여 주고, 판정 기준을 미리 고정하고, 두 검토자의 불일치를 기록한다

---

# 15. Agent 실행 격리

## 15.1 실행용 저장소 내보내기

`harness/export.sh <variant>` 가 다음을 만든다.

- `lab/variants/<variant>/` 만 담은 새 git 저장소. 저장소 이름은 두 Variant 모두 `shop-admin`
- commit 1개, 메시지 `Initial commit`. 작성 이력에 실험 의도가 드러날 수 있어 이력을 넘기지 않는다
- `_research`, `_design`, `lab/spec`, `lab/grading`, `lab/tasks`, 다른 Variant 는 넣지 않는다
- `CLAUDE.md`, `AGENTS.md`, `.claude/` 는 두 Variant 모두 두지 않는다. README 만 둔다
- 내보낸 저장소에서 `agentic`, `variant`, `실험`, `experiment` 문자열을 검색해 0건이어야 한다

## 15.2 실행 단위

**실행마다 컨테이너 1개, 저장소 clone 1개를 쓴다.** git worktree 는 쓰지 않는다. worktree 는 `.git` 의 ref 를 공유하므로 실험 2 에서 한 Agent 가 `git branch -a` 나 `git log --all` 로 다른 Agent 의 작업을 볼 수 있다.

| 자원 | 충돌 원인 | 대책 |
|---|---|---|
| build 산출물 | 같은 작업 트리 공유 | 실행마다 별도 clone. `build/`, `.gradle/`, `node_modules/.vite` 가 실행마다 따로 생긴다 |
| port | backend 8080, Vite 5173 동시 사용 | 컨테이너마다 network namespace 가 따로라 충돌하지 않는다. 컨테이너 밖 실행을 위해 port 는 환경 변수로 받는다 |
| temp directory | `/tmp` 공유 | 컨테이너마다 별도 `/tmp` |
| test DB · 파일 | H2 파일 공유 | H2 in-memory, Spring 의 고유 DB 이름 생성(`spring.datasource.generate-unique-name` 기본값) 사용. 파일 DB 금지 |
| frontend dev server | 다른 실행의 서버에 붙음 | Playwright `reuseExistingServer: false`, 컨테이너 분리 |
| Gradle cache | `~/.gradle` lock 경쟁, cache 상태 차이로 시간 측정 오염 | 실행마다 빈 `GRADLE_USER_HOME`. 의존성은 이미지에 미리 받아 둔 읽기 전용 cache(`GRADLE_RO_DEP_CACHE`)와 `--offline` 으로 읽는다 [확인 필요: Gradle 8.x/9.x 읽기 전용 cache 동작] |
| pnpm | store 쓰기 경쟁 | 이미지에 store 를 두고 Agent 시작 전 harness 가 `pnpm install --offline --frozen-lockfile` 실행. 설치 시간은 측정에서 뺀다 |
| Playwright 브라우저 | 다운로드 필요 | 이미지에 설치, `PLAYWRIGHT_BROWSERS_PATH` 고정 |
| Claude Code 설정 | 사용자 전역 `CLAUDE.md`, hook, skill, MCP, memory 가 섞임 | 실행마다 빈 `CLAUDE_CONFIG_DIR`, `--strict-mcp-config`(빈 설정), `--settings harness-settings.json`(기록용 hook 만), `DISABLE_AUTOUPDATER=1`, CLI 버전 고정 설치 |
| CPU · 메모리 | 동시 실행 컨테이너끼리 경쟁 | 컨테이너마다 같은 제한(예: CPU 4개, 메모리 8GB). 실험 2 의 시간 지표는 참고값으로만 쓴다 |

## 15.3 보안

- 실제 secret 을 쓰지 않는다. seed 의 로그인 계정은 시험용이며 README 에 적는다
- 컨테이너 외부 통신은 Anthropic API 도메인만 허용한다. Claude Code 공식 dev container 의 `init-firewall.sh` 방식을 따른다(https://code.claude.com/docs/en/devcontainer)
- API 인증 값은 환경 변수로만 넣고 저장소 · 이미지에 넣지 않는다. 실험 전용 key 와 예산 한도를 쓴다 [결정 필요]
- 컨테이너는 non-root 사용자로 실행하고 `--dangerously-skip-permissions` 는 이 조건에서만 쓴다. 공식 문서는 이 플래그를 non-root 컨테이너와 egress 제한을 함께 쓸 때 권한다
- 운영 환경 접근 경로가 없다. host 디렉터리는 결과 출력 디렉터리 하나만 mount 한다

---

# 16. 실험 공정성 검토

## 16.1 위협과 대책

| 위협 | 대책 | 남는 위험 |
|---|---|---|
| A 를 허수아비로 만듦 | §5.3 의 A 유리 원칙, 사람 리뷰어의 "실무 수용" 승인, §2.2 (1)(3) 수정 | 리뷰어 한 명의 기준 |
| B 에 정답이 들어 있음 | §2.2 (2) 수정, 과제별 "미리 있는 것과 없는 것" 명시(§8.3) | 표준 상태 선택이 우연히 버그와 가까울 수 있다 |
| 시험 수 차이 | 시나리오 ID 집합 동일 검사, 시험 수를 구분별로 보고 | B 의 story 실행은 처리 요소로 남는다 |
| 코드 양 차이 | 운영 · 시험 · 처리 요소 LOC 와 파일 수를 따로 보고 | B 의 파일 수가 많다(interface, `admin-page.ts`, story) |
| framework 특성 오염 | 같은 stack, Spring Modulith 미사용, glob 은 Vite 표준 기능 | `import.meta.glob` 은 Vite 전용이다. 책에서는 같은 원리의 다른 도구를 함께 적는다 |
| Agent instruction 차이 | 같은 과제 문구, 저장소 안 지침 파일 없음, README 절 구성 동일 | README 내용은 구조를 설명하므로 다르다 |
| 실험 의도 노출 | 내보내기 검사(§15.1), 이력 제거, 중립 이름 | 구조 자체에서 의도를 추측할 수 있다 |
| 숨은 정답 | 정답 파일을 미리 고정하지 않는다. 채점은 동작 기준 | 사람 검토의 위치 판정은 주관이 들어간다 |
| 측정 도구 편향 | 지표 스크립트 사전 고정, Variant 를 모르는 계산 | 분류 규칙(검색 · 읽기)이 명령 형태에 따라 놓치는 경우 |
| 같은 작성자가 두 Variant 를 만듦 | A 를 연구 문서 없이 명세만 받은 별도 세션이 만든다. B 는 A 를 차이 대장대로 재구성한다 | 명세와 과제를 같은 사람이 썼다 |

## 16.2 동일성 검사(기계)

| 검사 | 방법 | 통과 기준 |
|---|---|---|
| API 동일 | 두 Variant 를 seed 로 띄우고 모든 GET endpoint 응답 JSON 비교, 오류 응답 표본 비교 | 차이 0 |
| 화면 동일 | 화면 9개를 seed 데이터로 screenshot, 픽셀 비교 | 차이 0 |
| 시나리오 동일 | 시험 이름의 ID 집합 비교 | 동일 |
| 업무 로직 동일 | 규칙 클래스(`DeliveryFeePolicy` 등) 메서드 본문 비교. package · import 줄 제외. service 는 주입 타입 이름(`MemberService` 와 `MemberQuery`)을 같은 이름으로 바꾼 뒤 비교 | 동일 |
| 의존성 동일 | Gradle 의존성 목록, `pnpm-lock.yaml` 비교 | 차이 대장 D5 의 Storybook 관련 패키지만 차이 |
| 내보내기 검사 | §15.1 의 문자열 검색 | 0건 |
| 규모 보고 | 운영 · 시험 · 처리 요소 LOC, 파일 수, cold build 시간, 전체 시험 시간 | 업무 동작 시험 LOC 차이 20% 이내 [결정 필요: 기준값] |

## 16.3 사람 검토(구현 완료 시점)

검토자에게 A, B 를 각각 보여 주고 다음을 판정받는다.

- 이 구조를 실무 PR 로 받았을 때 승인하는가. A 가 승인되지 않으면 A 를 고친다
- VIP 무료배송 기준이 어디에 있는지 찾는 데 걸린 시간
- 새 관리자 화면을 추가하려면 어떤 파일을 만들고 고쳐야 하는지 설명하는 데 걸린 시간
- 전체 메뉴 구조를 말로 설명하는 데 걸린 시간
- 구조가 이해하기 어려운 지점

## 16.4 B 가 사람에게 더 어려운 부분

- 전체 메뉴를 파일 하나로 볼 수 없다. 출력 명령이나 grep 이 필요하다
- `internal` 과 공개 interface 때문에 같은 기능이 package 두 개로 나뉜다. `DeliveryFeeQuery` 와 `DeliveryFeeQueryService` 처럼 위임만 하는 클래스가 생긴다
- story 와 fixture 를 화면 변경 때 같이 고쳐야 한다
- ArchUnit 위반 메시지가 처음 보는 사람에게 낯설다
- R4 허용 표를 기능 사이 의존이 바뀔 때마다 고쳐야 한다

이 비용은 결과 보고의 "사람에게도 좋은가" 항목(`_research/12` 결과 읽는 방법)에 그대로 적는다.

## 16.5 자체 검토 기록

초안을 세 번 다시 읽고 고친 내용이다.

1회차:
- B 의 controller 를 use case 단위로 쪼개는 안을 뺐다. 실험 2 충돌 감소의 원인을 D4 와 나눌 수 없고 B 의 파일 수만 늘린다
- B 의 API client 를 화면 단위로 쪼개는 안을 뺐다. 같은 이유다
- A 에도 ArchUnit 레이어 규칙을 넣었다. "B 만 자동 검사가 있다" 는 차이를 "검사 대상이 다르다" 로 바꿨다
- B 에 Spring Modulith 를 쓰는 안을 뺐다. framework 특성이 결과에 섞인다
- 실험 1 의 예측에 B 의 기능 단위 검증이 다른 기능 시험을 놓치는 위험을 적었다. B 가 불리할 수 있는 지점을 사전 등록한다

2회차:
- 실험 2 에서 새 권한을 만드는 과제를 뺐다. 권한을 기능별로 흩으면 보안 기준이 분산돼 `_research/10` §3 과 충돌하고, 중앙에 두면 B 도 같은 파일을 고친다. v0.1 은 기존 권한을 쓰는 조회 화면으로 한정하고 한계에 적었다
- 메뉴 순서를 숫자로 정하는 안을 뺐다. 병렬 작업에서 같은 숫자를 고르는 의미 충돌이 B 에만 생긴다
- 실험 3 의 B 에서 시각 기준 화면을 표준 상태만 두도록 했다. 긴 부서명 기준 화면이 있으면 정답이 들어간다
- 실행 단위를 worktree 에서 clone 으로 바꿨다. ref 공유로 다른 Agent 작업이 보인다
- `staff` 영역 추가 이유를 적었다. 요청의 네 영역 범위를 넘는 변경이기 때문이다

3회차(작성 완료 후 재독):
- §7.4 예시에서 A 의 환불 service 가 회원 등급을 다른 방식으로 얻고 있어 "업무 로직 본문 동일" 과 맞지 않았다. A 도 `MemberService.gradeOf` 를 부르게 고치고, 동일성 검사에서 주입 타입 이름을 맞춘 뒤 비교하도록 했다
- 시험 산출물 수집이 Gradle 의 이전 XML 을 이번 결과로 셀 수 있었다. 명령 시작 시각 이후 수정된 파일만 복사하도록 고쳤다

---

# 17. 알려진 한계

- 코드베이스가 작아서 탐색 비용과 검증 시간 차이가 실제 업무 저장소보다 작게 나올 것이다. 차이가 없게 나오면 "이 규모에서는 차이가 없다" 로만 해석한다
- 모델 하나, 도구 하나(Claude Code)로 시작한다. 같은 모델이라도 실행 도구에 따라 행동이 달라진다는 보고가 있다(`_research/sources.md` K2)
- 실행당 5회 반복으로는 큰 차이만 구분할 수 있다
- 시작 시점 한 번의 작업만 본다. B 의 경계 검사가 효과를 내는 장기 변경(`_research/12` 사례 9)은 v0.1 범위 밖이다
- backend 는 Spring 이 이미 Controller 를 자동 등록하므로 실험 2 의 A/B 차이가 frontend 에 집중된다. 다른 framework 에서는 backend 중앙 등록 파일이 있을 수 있다
- 스키마 변경, 새 권한, 새 오류 코드처럼 중앙 파일을 피하기 어려운 변경은 실험 2 에 넣지 않았다
- 경로 이름으로 Variant 를 알 수 있어 사람 검토의 맹검이 불완전하다
- 명세 · 과제 · 두 Variant 의 설계를 같은 연구자가 했다
- Claude Code 버전이 바뀌면 결과가 달라질 수 있다. 실험 기간 동안 버전을 고정한다

---

# 18. 구현 순서

1. §19 의 결정 항목 확정
2. `lab/spec/` 작성(요구사항, API, 시나리오 ID, seed, 화면 명세)
3. `lab/grading/` 의 기본 동작 · 화면 채점 시험 작성. Variant 보다 먼저 쓴다
4. harness 골격: 컨테이너 이미지, 내보내기, 실행, 기록 수집. 빈 저장소로 pilot
5. Variant A 구현. 연구 문서가 없는 별도 디렉터리에서 명세만 받은 세션이 "Spring 레이어 구조와 React pages 구조" 지시로 만든다
6. A 사람 검토(§16.3). 승인 전에는 B 를 만들지 않는다
7. Variant B 를 A 에서 차이 대장대로 재구성
8. 동일성 검사(§16.2) 통과
9. 지표 계산 스크립트 작성과 고정. 기록 표본으로 분류 규칙 시험
10. 과제 문구와 사전 등록 예측을 `lab/tasks/` 에 commit 하고 기준 commit 에 tag(`lab-v0.1-base`)
11. pilot 실행(Variant 당 1회, 결과 제외)과 harness 수정
12. 실험 1, 실험 3, 실험 2 순서로 실행. 비용이 작은 실험부터 한다
13. 지표 계산, 사람 검토, 결과 문서

---

# 19. 구현 전에 확인해야 할 항목

| 항목 | 상태 | 영향 |
|---|---|---|
| 1차 실험 모델과 effort | [결정 필요] | 비용, 결과 해석 범위 |
| 실험 전용 API key 와 실행당 · 전체 예산 | [결정 필요] | `--max-budget-usd`, 반복 횟수 |
| 실험 실행 기계(이 Mac 의 Docker 또는 Linux 노드) | [결정 필요] | 시각 기준 화면, 동시 실행 수 |
| 원본 로그 보관 위치(git, release 첨부, 별도 저장소) | [결정 필요] | 결과 공개(`_research/15` §12) |
| `lab/` 를 이 저장소에 둘지 별도 저장소로 둘지 | 이 문서는 이 저장소의 `lab/` 를 가정한다. 실행용 저장소는 어느 쪽이든 내보내기로 분리된다 [결정 필요] | 저장소 관리 |
| TypeScript 7, Vitest 5, React Router 8 출시일 | [확인 필요] | §3.1 버전 고정 규칙 |
| Gradle 읽기 전용 의존성 cache 동작 | [확인 필요] | §15.2 Gradle 격리 |
| Storybook 10 의 Vitest addon 과 Vitest 5 호환 | [확인 필요] | §11.1 story 실행 |
| 사람 검토자 2명 | [결정 필요] | §14.7, §16.3 |
| 동일성 검사의 규모 차이 기준값 | [결정 필요] | §16.2 |

## 구현 시작 가능 여부

설계는 구현을 시작할 수 있는 상태다. 위 표의 [결정 필요] 중 모델 · 예산 · 실행 기계는 harness 구현(§18 4단계) 전에, 나머지는 실험 실행(§18 12단계) 전에 정하면 된다.
§18 의 2~3단계(명세와 채점 시험)는 지금 시작할 수 있다.
