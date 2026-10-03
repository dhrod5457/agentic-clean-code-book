# 요구사항

쇼핑몰 관리자 시스템의 기능 명세다. 구현의 기준은 이 문서, `api.md`, `scenarios.md`, `ui.md`, `schema.sql`, `seed.sql` 이다.
요청 · 응답 형식과 오류 코드는 `api.md`, 화면은 `ui.md` 에 있다.

## 1. 범위

| 영역 | 기능 |
|---|---|
| member(회원) | 회원 목록 · 상세 조회, 상태 변경, 등급 변경, 탈퇴 처리 |
| order(주문) | 주문 금액 미리보기, 주문 생성, 모의 결제 완료, 주문 목록 · 상세 조회, 결제 기한이 지난 주문 만료 처리 |
| delivery(배송) | 배송비 계산, 무료배송 규칙, 배송 목록 조회, 배송 상태 변경, 배송 정책 조회 |
| refund(환불) | 환불 요청 · 승인 · 거절, 부분 환불 시 배송비 차감, 환불 목록 조회 |
| staff(관리자 계정) | 관리자 계정 목록 조회 · 생성 · 역할 변경 · 비활성화, 로그인 · 로그아웃 · 현재 사용자 조회 |

범위 밖: 고객 로그인, 상품 카탈로그, 할인 · 쿠폰, 실제 결제 연동, 배송비 환불, 기준 금액 변경 화면.

## 2. 시각

- 고정 기준 시각은 `2026-01-15T10:00:00+09:00` 이다. `seed.sql` 의 모든 시각은 이 시각을 기준으로 만든 값이다
- 설정 키 `shop.clock.fixed-instant` 에 ISO-8601 시각을 넣으면 애플리케이션의 `Clock` 이 그 시각에 고정된다. 값이 비어 있으면 시스템 시계를 쓴다
- `application.yml` 의 기본값은 `shop.clock.fixed-instant: 2026-01-15T10:00:00+09:00` 이다. 개발 실행, E2E, 외부 시험 모두 이 값으로 실행한다
- 시간대는 `Asia/Seoul` 이다. JSON 의 시각은 offset 을 붙인 ISO-8601(`2026-01-15T10:00:00+09:00`)이다

## 3. 업무 규칙

### 3.1 회원

- 등급은 `GENERAL`, `VIP` 다
- 상태는 `ACTIVE`, `SUSPENDED`, `WITHDRAWN` 이다
- 상태 변경 API 는 `ACTIVE` 와 `SUSPENDED` 만 받는다. `WITHDRAWN` 을 보내면 400 `VALIDATION_FAILED` 다. 현재와 같은 상태를 보내면 바꾸지 않고 200 이다
- 등급 변경도 현재와 같은 등급을 보내면 200 이다
- 탈퇴 처리는 상태를 `WITHDRAWN` 으로 바꾸고 `withdrawnAt` 에 현재 시각을 넣는다
- 탈퇴한 회원의 상태 변경, 등급 변경, 탈퇴 처리는 409 `MEMBER_WITHDRAWN` 이다
- 주문할 수 있는 회원은 `ACTIVE` 회원뿐이다. 그 밖의 회원으로 주문 미리보기나 주문 생성을 하면 409 `MEMBER_NOT_ORDERABLE` 이다

### 3.2 배송비

- 기본 배송비는 3,000원이다
- 상품 금액은 주문 상품의 `단가 × 수량` 합계다. 할인 기능은 없다
- **VIP 회원이고 상품 금액이 150,000원 이상이면 배송비는 0원이다.** 그 밖에는 3,000원이다. GENERAL 회원은 항상 3,000원이다
- 회원 등급은 배송비를 계산하는 시점의 등급을 쓴다
- 무료배송 판단은 한 곳(`DeliveryFeePolicy`)에서 한다. 주문과 환불은 이 판단을 다시 구현하지 않고 불러 쓴다

### 3.3 주문

- 주문 상태는 `PENDING_PAYMENT`(결제 대기), `PAID`(결제 완료), `EXPIRED`(만료) 세 가지다
- 주문 생성 시 상품 금액, 배송비, 결제 금액(`상품 금액 + 배송비`)을 계산해 주문에 저장한다. 상태는 `PENDING_PAYMENT`, `createdAt` 은 현재 시각이다
- 주문에 저장한 배송비는 나중에 기준이나 회원 등급이 바뀌어도 바뀌지 않는다
- 주문 금액 미리보기는 주문 생성과 같은 계산을 하고 저장하지 않는다
- 모의 결제 완료(`POST /api/orders/{id}/pay`)
  - `PENDING_PAYMENT` 가 아니면 409 `ORDER_STATE_INVALID`
  - 현재 시각이 `createdAt + 30분` 이상이면 409 `ORDER_PAYMENT_EXPIRED`. 주문 상태는 바꾸지 않는다
  - 성공하면 상태를 `PAID`, `paidAt` 을 현재 시각으로 바꾸고, 주문에 저장된 배송비를 복사한 배송을 `READY` 상태로 만든다
- 만료 처리(`POST /api/admin/orders/expire-overdue`)는 `createdAt + 30분` 이 현재 시각 이하인 `PENDING_PAYMENT` 주문을 모두 `EXPIRED` 로 바꾸고 `expiredAt` 에 현재 시각을 넣는다. 응답은 바꾼 건수다
- 고객 로그인은 없다. `/api/orders/**` 는 요청 본문의 `memberId` 로 동작하고 인증하지 않는다

### 3.4 배송

- 배송 상태는 `READY`(출고 대기), `SHIPPED`(배송 중), `DELIVERED`(배송 완료)다
- 허용하는 변경은 `READY → SHIPPED`(`shippedAt` 기록)와 `SHIPPED → DELIVERED`(`deliveredAt` 기록) 두 가지다. 그 밖의 변경은 409 `DELIVERY_STATE_INVALID` 다
- 배송 상태 변경은 주문 상태를 바꾸지 않는다
- 배송 정책 조회는 기본 배송비와 VIP 무료배송 기준 금액을 돌려준다

### 3.5 환불

- 환불 상태는 `REQUESTED`(요청), `APPROVED`(승인), `REJECTED`(거절)다
- 환불 요청 조건을 다음 순서로 확인한다
  1. 주문이 없으면 404 `ORDER_NOT_FOUND`
  2. 주문이 `PAID` 가 아니면 409 `REFUND_ORDER_NOT_PAID`
  3. 배송 상태가 `SHIPPED` 이면 409 `REFUND_STATE_INVALID`. `READY` 와 `DELIVERED` 는 요청할 수 있다
  4. 같은 주문에 `REQUESTED` 환불이 있으면 409 `REFUND_ALREADY_REQUESTED`
  5. 환불 금액이 `주문 상품 금액 − 승인된 환불 금액 합계` 보다 크면 409 `REFUND_AMOUNT_EXCEEDED`
- 환불 금액이 주문 상품 금액보다 작으면 부분 환불(`partial: true`)이다. 요청 시점에 정해 저장한다
- 환불은 환불 기록만 남기고 주문 상태와 배송 상태를 바꾸지 않는다. 배송비는 환불하지 않는다
- 승인은 `REQUESTED` 환불만 할 수 있다. 그 밖에는 409 `REFUND_ALREADY_PROCESSED` 다. 거절도 같다
- **부분 환불 시 배송비 차감**: 승인 시점에 다음을 모두 만족하면 배송비 차감액을 `min(3,000원, 환불 금액)` 으로 정한다. 하나라도 만족하지 않으면 0원이다
  - 부분 환불이다
  - 주문에 저장된 배송비가 0원이다
  - 같은 주문의 이전 승인 환불에 차감액이 0원보다 큰 것이 없다(한 주문에서 차감은 한 번)
  - 남은 상품 금액(`주문 상품 금액 − 이전 승인 환불 금액 합계 − 이번 환불 금액`)이 회원의 현재 등급으로 무료배송 조건을 만족하지 않는다
- 승인하면 `deliveryFeeDeduction` 에 차감액, `refundedAmount` 에 `환불 금액 − 차감액`, `processedAt` 에 현재 시각을 넣는다
- 거절하면 `processedAt` 만 넣는다. `deliveryFeeDeduction` 과 `refundedAmount` 는 `null` 이다

예: VIP 회원의 160,000원 주문(배송비 0원)에서 20,000원 부분 환불을 승인하면 남은 상품 금액 140,000원이 기준 미만이므로 차감액 3,000원, 환불 금액 17,000원이다.

### 3.6 관리자 계정과 로그인

- 역할은 `ADMIN`, `OPERATOR` 다
- 관리자 계정 생성 시 `active` 는 `true`, `createdAt` 은 현재 시각이다. 로그인 ID 가 이미 있으면 409 `STAFF_LOGIN_ID_DUPLICATED` 다
- 비활성화는 `active` 를 `false` 로 바꾼다. 이미 비활성 계정이면 그대로 200 이다
- 역할 변경은 비활성 계정에도 할 수 있다. 자기 계정의 역할 변경과 비활성화도 허용한다. 마지막 ADMIN 을 남기는 규칙은 없다
- 비활성 계정은 로그인할 수 없다. 로그인 실패와 같은 401 `AUTH_FAILED` 다
- 로그인에 성공하면 세션을 만들고 현재 사용자 정보와 권한 목록을 돌려준다
- 로그아웃은 세션을 무효화한다
- 로그인 요청은 `loginId`, `password` 가 있는지만 검사한다(없거나 빈 문자열이면 400 `VALIDATION_FAILED`). §4 의 로그인 ID 형식 · 비밀번호 길이는 로그인에 적용하지 않고, 맞는 계정이 없으면 401 `AUTH_FAILED` 다
- 세션에는 관리자 계정 ID 만 둔다. 요청마다 관리자 계정을 다시 읽어 역할과 활성 여부를 판단한다. 역할이 바뀌면 다음 요청부터 새 권한이 적용되고, 비활성화되면 다음 요청부터 401 `AUTH_REQUIRED` 다

## 4. 입력 검증

검증 실패는 모두 400 `VALIDATION_FAILED` 다. 요청 본문을 JSON 으로 읽을 수 없거나 타입이 맞지 않는 경우(숫자 자리에 문자열, 정수 자리에 소수)도 같다.
문자열은 앞뒤 공백을 지우지 않고 저장한다. 공백만 있는 문자열은 빈 문자열로 보고 검증한다.

| 값 | 조건 |
|---|---|
| 필수 값 | `api.md` 에서 필수로 표시한 값이 없거나 `null` |
| enum 값 | 정의하지 않은 문자열(대소문자 구분) |
| 경로의 ID | 숫자가 아닌 값 |
| 금액 | 단가 0 이상, 환불 금액 1 이상. 음수 금지 |
| 수량 | 1 이상 |
| 주문 상품 | 1개 이상. 상품명 1 ~ 100자 |
| 환불 사유 | 1 ~ 200자 |
| 로그인 ID | 4 ~ 30자, 영문 소문자 · 숫자 · `.` · `_` |
| 관리자 이름 | 1 ~ 50자 |
| 부서명 | 1 ~ 200자 |
| 비밀번호 | 8 ~ 64자, ASCII 출력 가능 문자(영문 · 숫자 · 특수문자) |

## 5. 권한

권한은 영역별 `<영역>_READ`, `<영역>_WRITE` 열 개다: `MEMBER_READ`, `MEMBER_WRITE`, `ORDER_READ`, `ORDER_WRITE`, `DELIVERY_READ`, `DELIVERY_WRITE`, `REFUND_READ`, `REFUND_WRITE`, `STAFF_READ`, `STAFF_WRITE`.

| 역할 | 권한 |
|---|---|
| ADMIN | 열 개 모두 |
| OPERATOR | `_READ` 다섯 개 전부와 `DELIVERY_WRITE` |

API 권한은 경로 prefix 와 HTTP method 로 정한다. `GET` 은 `_READ`, 그 밖의 method 는 `_WRITE` 가 필요하다.

| 경로 prefix | 영역 |
|---|---|
| `/api/admin/members/**` | MEMBER |
| `/api/admin/orders/**` | ORDER |
| `/api/admin/deliveries/**`, `/api/admin/delivery-policy` | DELIVERY |
| `/api/admin/refunds/**` | REFUND |
| `/api/admin/staff/**` | STAFF |

- `POST /api/auth/login` 과 `/api/orders/**` 는 로그인 없이 호출한다. `/api` 로 시작하지 않는 경로(화면, 정적 파일)도 로그인 없이 제공한다
- `POST /api/auth/logout`, `GET /api/auth/me`, `/api/admin/**` 는 로그인이 필요하다. 로그인하지 않았으면 401 `AUTH_REQUIRED`, 권한이 없으면 403 `ACCESS_DENIED` 다

## 6. 시험용 계정

`seed.sql` 의 관리자 계정 12개는 비밀번호가 모두 `test1234!` 다.

| 로그인 ID | 역할 | 상태 |
|---|---|---|
| `admin` | ADMIN | 활성 |
| `operator` | OPERATOR | 활성 |
| `oh.log` | OPERATOR | 비활성 |

## 7. 보안

- 비밀번호는 Spring Security 의 `DelegatingPasswordEncoder` 로 저장한다. `seed.sql` 의 값은 `{bcrypt}` 형식이다
- 로그인은 JSON API(`POST /api/auth/login`)로 하고 form login 화면을 쓰지 않는다
- 세션 쿠키는 `HttpOnly`, `SameSite=Strict` 다. CSRF 토큰은 쓰지 않는다
- 인증 · 권한 실패도 `api.md` §2 의 JSON 오류 응답으로 돌려준다. 로그인 화면으로 redirect 하지 않는다

## 8. 실행 형태

| 형태 | 구성 | 용도 |
|---|---|---|
| 개발 | `./gradlew bootRun`(8080) + `pnpm dev`(5173, `/api` 를 8080 으로 proxy) | 개발 중 확인 |
| 단일 port | backend jar 가 frontend build 결과를 같은 port 로 제공 | E2E, 외부 시험 |

단일 port 실행:

```
java -jar backend/build/libs/shop-admin.jar --server.port=<port> --shop.frontend.dist-dir=<frontend/dist 절대 경로>
```

- `shop.frontend.dist-dir` 가 있으면 그 디렉터리의 정적 파일을 제공한다
- SPA fallback: `/api` 로 시작하지 않는 `GET` 요청 중 마지막 경로 조각에 `.` 이 없는 요청은 `index.html` 을 돌려준다
- `shop.frontend.dist-dir` 가 없으면 정적 파일을 제공하지 않는다

## 9. 데이터

- 애플리케이션 시작 시 `schema.sql` 과 `seed.sql` 을 실행한다(H2 in-memory). 기동할 때마다 seed 상태로 시작하고, 실행 중 바뀐 데이터는 재기동하면 사라진다
- seed 의 ID 는 1 부터이고, 새로 만드는 행의 ID 는 1001 부터다
- 목록 정렬: 회원 · 관리자 계정은 ID 오름차순, 주문 · 배송 · 환불은 ID 내림차순
- 목록 API 는 전체 행을 돌려준다. 페이지 나누기는 없다
