# shop-admin

## 개요

쇼핑몰 관리자 시스템이다. 회원, 주문, 배송, 환불, 관리자 계정 다섯 영역을 관리한다.
명세는 `lab/spec/` 의 `requirements.md`, `api.md`, `scenarios.md`, `ui.md`, `schema.sql`, `seed.sql` 이다.

- Backend: Java 25, Spring Boot 4.1(Spring MVC, Spring Security 세션), `JdbcClient` 와 직접 작성한 SQL, H2 in-memory
- Frontend: React 19, TypeScript, Vite, React Router, TanStack Query, plain CSS
- 애플리케이션 시계는 `shop.clock.fixed-instant`(기본값 `2026-01-15T10:00:00+09:00`)에 고정된다. 값을 비우면 시스템 시계를 쓴다
- 기동할 때마다 `schema.sql` 과 `seed.sql` 로 seed 상태에서 시작한다. 실행 중 바뀐 데이터는 재기동하면 사라진다

## 실행

필요한 도구: Java 25(Temurin 25.0.4.1+1), Node.js 24.21.0, pnpm 10.34.6.
처음 한 번 `frontend/` 에서 `pnpm install` 을 실행한다.

개발 실행(두 terminal):

```
cd backend && ./gradlew bootRun     # http://localhost:8080
cd frontend && pnpm dev             # http://localhost:5173, /api 는 8080 으로 proxy
```

단일 port 실행(E2E · 외부 시험 형태):

```
cd frontend && pnpm build
cd backend && ./gradlew bootJar
java -jar backend/build/libs/shop-admin.jar --server.port=18080 --shop.frontend.dist-dir=<frontend/dist 절대 경로>
```

`shop.frontend.dist-dir` 가 있으면 그 디렉터리의 정적 파일을 제공하고, `/api` 로 시작하지 않으면서 마지막 경로 조각에 `.` 이 없는 `GET` 요청에는 `index.html` 을 돌려준다.

## 시험 명령

완료 전 `./gradlew test` 와 `pnpm test` 를 실행한다.

| 명령 | 실행 위치 | 내용 |
|---|---|---|
| `./gradlew test` | `backend/` | 단위(`service/`) · web slice(`controller/`) · 통합(`integration/`) · 구조(`architecture/`) 시험 |
| `./gradlew spotlessApply` | `backend/` | google-java-format 적용(`spotlessCheck` 는 검사만) |
| `pnpm lint` | `frontend/` | ESLint |
| `pnpm test` | `frontend/` | Vitest jsdom component 시험. JUnit 결과는 `frontend/reports/junit-vitest.xml` |
| `pnpm e2e` | `frontend/` | Playwright E2E(Chromium, 1280×800). frontend 와 backend 를 build 해 단일 port(`APP_PORT`, 기본 18080)로 띄운 뒤 시험한다. JUnit 결과는 `frontend/reports/junit-e2e.xml` |
| `pnpm format` | `frontend/` | Prettier 적용 |
| `./scripts/verify-all.sh` | 저장소 루트 | `./gradlew test`, `pnpm lint`, `pnpm test`, `pnpm e2e` 를 순서대로 실행하고 하나라도 실패하면 실패 |

특정 시험만 실행하는 예: `./gradlew test --tests '*StaffServiceTest'`

시험 이름 앞에는 `scenarios.md` 의 시나리오 ID 를 붙인다(예: `[DLV-01] VIP 회원 150,000원 주문은 배송비 0원`). 시험은 시계를 기준 시각에 고정해 실행 날짜와 관계없이 같은 결과를 낸다.

## 디렉터리 구조

```
backend/
  src/main/java/com/example/shop/
    ShopApplication.java
    config/       SecurityConfig, SessionAuthenticationFilter, ClockConfig, WebConfig
    common/       error/(ErrorCode, BusinessException, GlobalExceptionHandler, ErrorResponse), money/(Money)
    controller/   AuthController, OrderController, admin/(영역별 관리자 API)
    service/      영역별 service, DeliveryFeePolicy, SessionUserService, OrderExpiryService
    repository/   영역별 JdbcClient repository
    domain/       도메인 record · enum, 다른 영역에 넘기는 요약 record(MemberSummary, OrderSummary)
    dto/          member/ order/ delivery/ refund/ staff/ 요청 · 응답 record
  src/main/resources/   application.yml, schema.sql, seed.sql(명세 파일 그대로)
  src/test/java/com/example/shop/
    service/      단위 시험(Spring 없음, Mockito)
    controller/   web slice 시험(@WebMvcTest + SecurityConfig)
    integration/  CheckoutFlowIT, RefundFlowIT(@SpringBootTest)
    architecture/ LayerRulesTest(ArchUnit)
    support/      시험 공통 고정값
frontend/
  src/
    app/          App, adminRoutes(route · 메뉴 · 화면 권한 표), Layout, Sidebar, RequirePermission
    pages/        member/ order/ delivery/ refund/ staff/ login/ (*Page 조회, *View 표시, *.test.tsx)
    components/   DataTable, StatusBadge, MoneyText, DateTimeText
    api/          client.ts, 영역별 <영역>Api.ts
    types/        영역별 타입, permission.ts
    hooks/        useSession.ts
  e2e/            helpers/(session.ts, api.ts), *.spec.ts
scripts/
  verify-all.sh
```

## 규칙

### 레이어 package

- `controller` → `service` → `repository` 순서로 호출한다. `controller` 는 요청 · 응답을 `dto` record 로 바꾸고, `service` 와 `repository` 는 `domain` 타입만 다룬다
- 무료배송 판단은 `service/DeliveryFeePolicy` 한 곳에서 한다. 기본 배송비와 무료배송 기준 금액 숫자는 그 클래스에만 있다
- 로그인 · 로그아웃 · 현재 사용자 조회는 관리자 계정(staff) 영역이며 `AuthController` 와 `SessionUserService` 가 맡는다. 세션에는 관리자 계정 ID 만 두고 요청마다 계정을 다시 읽는다
- `SecurityConfig` 의 권한 규칙은 영역 prefix 단위다(`GET` 은 `_READ`, 그 밖의 method 는 `_WRITE`)
- 시각이 필요한 코드는 `ClockConfig` 의 `Clock` bean 을 주입받는다
- 오류 코드는 `common/error/ErrorCode` 한 곳에 둔다. 이메일, 이름, 비밀번호, 세션 값은 로그에 남기지 않는다

### 영역 사이 호출

다른 영역의 데이터는 그 영역의 service 메서드로 읽고 바꾼다. 다른 영역의 repository 를 주입받지 않는다. 허용하는 호출 방향은 다음뿐이다.

```
order    → member, delivery
refund   → order, delivery, member
delivery → member (MemberGrade 타입만)
staff    → 없음
member   → 없음
```

다른 영역 service 메서드의 인자와 반환값은 ID(`long`), 요약 record(`MemberSummary`, `OrderSummary`), enum(`MemberGrade`, `OrderStatus`, `DeliveryStatus`), `Money` 만 쓴다. 도메인 클래스(`Member`, `Order`, `Delivery`, `Refund`, `Staff`)는 넘기지 않는다.

### ArchUnit 규칙(`architecture/LayerRulesTest`)

| 이름 | 규칙 |
|---|---|
| L1 | `controller` 는 `repository` 를 참조하지 않는다 |
| L2 | `service` · `repository` · `domain` 은 `controller` · `dto` 를 참조하지 않는다 |

## 시험용 로그인 계정

`seed.sql` 의 관리자 계정 12개는 비밀번호가 모두 `test1234!` 다.

| 로그인 ID | 역할 | 상태 |
|---|---|---|
| `admin` | ADMIN | 활성 |
| `operator` | OPERATOR | 활성 |
| `oh.log` | OPERATOR | 비활성 |
