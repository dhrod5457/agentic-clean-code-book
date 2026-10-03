# 구현 지시

이 디렉터리의 명세(`requirements.md`, `api.md`, `scenarios.md`, `ui.md`, `schema.sql`, `seed.sql`)를 아래 약속에 따라 구현한다.
명세와 이 문서가 다르면 명세를 따르고 차이를 보고한다.

## 1. 기술

- 버전은 `versions.md` 를 따른다
- Backend: Spring Boot, Spring MVC, Spring Security(세션), `JdbcClient` 와 직접 작성한 SQL, H2 in-memory. JPA 를 쓰지 않는다
- Build: Gradle wrapper, Kotlin DSL, 단일 module
- Frontend: React, TypeScript, Vite, React Router, TanStack Query. 스타일은 plain CSS 파일로 쓰고 UI 라이브러리를 쓰지 않는다
- Lint · format: ESLint(flat config), Prettier, Spotless(google-java-format)
- 저장소 루트에 `backend/`, `frontend/`, `scripts/`, `README.md` 를 둔다

## 2. Backend 구조

레이어별 package 로 나눈다.

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
  service/         MemberService, OrderService, OrderExpiryService, DeliveryService, SessionUserService,
                   DeliveryFeePolicy, RefundService, StaffService
  repository/      MemberRepository, OrderRepository, DeliveryRepository, RefundRepository, StaffRepository
  domain/          Member, MemberSummary, MemberGrade, MemberStatus, Order, OrderSummary, OrderLine, OrderStatus,
                   Delivery, DeliveryStatus, Refund, RefundStatus, Staff, Role, Permission
  dto/
    member/ order/ delivery/ refund/ staff/   요청 · 응답 record
backend/src/main/resources/
  application.yml, schema.sql, seed.sql
backend/src/test/java/com/example/shop/
  service/         단위 시험(Spring 없음)
  controller/      web slice 시험(@WebMvcTest)
  integration/     CheckoutFlowIT, RefundFlowIT (@SpringBootTest)
  architecture/    LayerRulesTest
```

- `schema.sql`, `seed.sql` 은 이 디렉터리의 파일을 바이트 그대로 복사한다
- 무료배송 판단은 `service/DeliveryFeePolicy` 한 곳에서 한다. 기본 배송비와 무료배송 기준 금액 숫자는 운영 코드에 한 번씩만 나온다
- 로그인 · 로그아웃 · 현재 사용자 조회는 관리자 계정(staff) 영역의 기능이다. `AuthController` 와 `SessionUserService` 가 맡는다
- `SecurityConfig` 의 권한 규칙은 영역 prefix 단위로 쓴다(`requirements.md` §5). endpoint 마다 규칙을 추가하지 않는다
- `ClockConfig` 는 `Clock` bean 하나를 만든다. 시각이 필요한 코드는 이 `Clock` 을 주입받는다

## 3. 영역 사이 호출

다른 영역의 데이터는 그 영역의 service 메서드로 읽고 바꾼다. 다른 영역의 repository 를 주입받지 않는다.

호출 방향은 다음만 허용한다. 반대 방향이나 표에 없는 호출을 만들지 않는다.

```
order    → member, delivery
refund   → order, delivery, member
delivery → member (MemberGrade 타입만)
staff    → 없음
member   → 없음
```

다른 영역 service 메서드의 인자와 반환값은 다음 타입만 쓴다. 도메인 클래스(`Member`, `Order`, `Delivery`, `Refund`, `Staff`)를 넘기거나 돌려주지 않는다.

- ID(`long`)
- `domain/` 의 요약 record: `MemberSummary`, `OrderSummary`
- enum: `MemberGrade`, `OrderStatus`, `DeliveryStatus`
- `Money`

## 4. 구조 검사

`architecture/LayerRulesTest` 에 ArchUnit 규칙 두 개를 둔다.

| 이름 | 규칙 |
|---|---|
| L1 | `controller` 는 `repository` 를 참조하지 않는다 |
| L2 | `service` · `repository` · `domain` 은 `controller` · `dto` 를 참조하지 않는다 |

## 5. 오류와 로그

- 오류 코드는 `common/error/ErrorCode` enum 한 곳에 둔다. 코드 문자열, HTTP 상태, 메시지는 `api.md` §2 와 같아야 한다
- 업무 오류는 WARN 으로 `code` 와 메시지를 남긴다. 시스템 오류는 ERROR 와 stack trace 를 남긴다
- 이메일, 이름, 비밀번호, 세션 값을 로그에 남기지 않는다

## 6. Frontend 구조

```
frontend/src/
  main.tsx
  app/         App.tsx, adminRoutes.tsx, Layout.tsx, Sidebar.tsx, RequirePermission.tsx
  pages/       member/ order/ delivery/ refund/ staff/ login/   (화면, 표시 컴포넌트, *.test.tsx)
  components/  DataTable.tsx, StatusBadge.tsx, MoneyText.tsx
  api/         client.ts, memberApi.ts, orderApi.ts, deliveryApi.ts, refundApi.ts, staffApi.ts
  types/       member.ts, order.ts, delivery.ts, refund.ts, staff.ts, permission.ts
  hooks/       useSession.ts
frontend/e2e/  helpers/ (login, API 보조 함수), *.spec.ts
```

- route · 메뉴 · 화면 권한은 `src/app/adminRoutes.tsx` 한 표에서 관리한다. 상세 화면 항목은 `inMenu: false` 로 메뉴에서 뺀다
- 화면은 데이터 조회 컴포넌트(`*Page.tsx`)와 표시 컴포넌트(`*View.tsx` 또는 `*Table.tsx`)로 나눈다. 표시 컴포넌트는 props 만 받는다
- 모든 목록은 `components/DataTable.tsx` 를 쓴다. 동작은 `ui.md` §2
- API 호출은 영역별 파일 하나(`api/<영역>Api.ts`)에 둔다

## 7. 시험

- `scenarios.md` 의 시나리오 ID 마다 그 표의 시험 단계에 시험을 하나씩 둔다. 시험 이름 앞에 ID 를 넣는다
  - Java: `@DisplayName("[DLV-01] VIP 회원 150,000원 주문은 배송비 0원")`
  - TypeScript: `it('[DLV-10] 출고 대기 배송에 출고 처리 버튼을 보여 준다', ...)`
- 시나리오에 없는 시험은 구조 시험(ArchUnit)만 둔다
- 통합 시험은 `CheckoutFlowIT`, `RefundFlowIT` 두 개다
- E2E 보조 함수: `e2e/helpers/session.ts` 의 `login`, `e2e/helpers/api.ts` 의 `createStaff`, `createOrder`, `payOrder`, `requestRefund`. 데이터는 화면 클릭이 아니라 API 로 만든다
- 시험은 `Clock` 을 고정값으로 주입한다. 실행 날짜에 따라 결과가 바뀌는 시험을 만들지 않는다

## 8. 명령과 실행 설정

| 명령 | 실행 위치 | 내용 |
|---|---|---|
| `./gradlew test` | `backend/` | backend 단위 · web slice · 통합 · 구조 시험 |
| `./gradlew bootRun` | `backend/` | backend 실행(port 8080) |
| `pnpm dev` | `frontend/` | Vite 개발 서버(port 5173). `/api` 요청을 `http://localhost:8080` 으로 proxy |
| `pnpm test` | `frontend/` | `vitest run`. jsdom component 시험 |
| `pnpm e2e` | `frontend/` | Playwright E2E |
| `pnpm lint` | `frontend/` | ESLint |
| `./scripts/verify-all.sh` | 저장소 루트 | `./gradlew test`, `pnpm lint`, `pnpm test`, `pnpm e2e` 를 순서대로 실행하고 하나라도 실패하면 실패 |

- Vitest 는 `default` 와 `junit` reporter 를 쓰고 JUnit 결과를 `frontend/reports/junit-vitest.xml` 에 쓴다
- Playwright 는 `list` 와 `junit` reporter 를 쓰고 JUnit 결과를 `frontend/reports/junit-e2e.xml` 에 쓴다
- E2E 는 backend jar 와 frontend build 결과를 한 port 로 실행한 애플리케이션(`requirements.md` §8)에 붙는다. port 는 환경 변수 `APP_PORT` 로 받는다(기본값 18080. 개발 실행의 8080 과 겹치지 않게 한다). Playwright `webServer` 는 `reuseExistingServer: false` 로 둔다
- Playwright 는 Chromium 만 쓰고 viewport 는 1280×800 이다

## 9. README

절 구성은 다음 순서다: 개요, 실행, 시험 명령, 디렉터리 구조, 규칙, 시험용 로그인 계정.

- 시험 명령 절에 다음 두 문장을 그대로 넣는다
  - "완료 전 `./gradlew test` 와 `pnpm test` 를 실행한다."
  - "특정 시험만 실행하는 예: `./gradlew test --tests '*StaffServiceTest'`"
- 규칙 절에는 레이어 package 규칙, 영역 사이 호출 약속(§3), ArchUnit 규칙 L1 · L2 를 적는다
- 시험용 로그인 계정 절에는 `requirements.md` §6 의 계정을 적는다
