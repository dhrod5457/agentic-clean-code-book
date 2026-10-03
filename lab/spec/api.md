# API

규칙은 `requirements.md` 에 있다. 이 문서는 요청 · 응답 형식과 오류 응답을 정한다.

## 1. 공통

- 요청 · 응답 본문은 JSON(`application/json; charset=UTF-8`), 필드 이름은 camelCase 다
- 금액은 원 단위 정수다
- 시각은 `2026-01-15T10:00:00+09:00` 형식이다. 값이 없으면 `null` 이다
- enum 은 문자열이다
- 목록 응답은 JSON 배열이다
- 예시의 ID 와 값은 형식 설명용이다. 실제 값은 `seed.sql` 을 따른다
- "필수" 열이 O 인 값이 없거나 `null` 이면 400 `VALIDATION_FAILED` 다

## 2. 오류 응답

```json
{ "code": "REFUND_STATE_INVALID", "message": "배송 중인 주문은 환불을 요청할 수 없습니다." }
```

| code | HTTP | message |
|---|---|---|
| `VALIDATION_FAILED` | 400 | 요청 값이 올바르지 않습니다. |
| `AUTH_REQUIRED` | 401 | 로그인이 필요합니다. |
| `AUTH_FAILED` | 401 | 아이디 또는 비밀번호가 올바르지 않습니다. |
| `ACCESS_DENIED` | 403 | 권한이 없습니다. |
| `MEMBER_NOT_FOUND` | 404 | 회원을 찾을 수 없습니다. |
| `MEMBER_WITHDRAWN` | 409 | 탈퇴한 회원입니다. |
| `MEMBER_NOT_ORDERABLE` | 409 | 주문할 수 없는 회원 상태입니다. |
| `ORDER_NOT_FOUND` | 404 | 주문을 찾을 수 없습니다. |
| `ORDER_STATE_INVALID` | 409 | 결제 대기 상태의 주문만 결제할 수 있습니다. |
| `ORDER_PAYMENT_EXPIRED` | 409 | 결제 기한이 지난 주문입니다. |
| `DELIVERY_NOT_FOUND` | 404 | 배송을 찾을 수 없습니다. |
| `DELIVERY_STATE_INVALID` | 409 | 변경할 수 없는 배송 상태입니다. |
| `REFUND_NOT_FOUND` | 404 | 환불을 찾을 수 없습니다. |
| `REFUND_ORDER_NOT_PAID` | 409 | 결제 완료된 주문만 환불을 요청할 수 있습니다. |
| `REFUND_STATE_INVALID` | 409 | 배송 중인 주문은 환불을 요청할 수 없습니다. |
| `REFUND_ALREADY_REQUESTED` | 409 | 처리 중인 환불 요청이 있습니다. |
| `REFUND_AMOUNT_EXCEEDED` | 409 | 환불 가능 금액을 넘었습니다. |
| `REFUND_ALREADY_PROCESSED` | 409 | 이미 처리된 환불입니다. |
| `STAFF_NOT_FOUND` | 404 | 관리자 계정을 찾을 수 없습니다. |
| `STAFF_LOGIN_ID_DUPLICATED` | 409 | 이미 사용 중인 로그인 ID 입니다. |
| `NOT_FOUND` | 404 | 요청한 경로를 찾을 수 없습니다. |
| `METHOD_NOT_ALLOWED` | 405 | 지원하지 않는 요청 방식입니다. |
| `INTERNAL_ERROR` | 500 | 서버 오류가 발생했습니다. |

`NOT_FOUND`, `METHOD_NOT_ALLOWED` 는 정의하지 않은 `/api/**` 경로와 method 에, `INTERNAL_ERROR` 는 예상하지 못한 예외에 쓴다.
경로의 ID 가 숫자가 아니면 모든 endpoint 에서 400 `VALIDATION_FAILED` 다. 아래 표의 오류 열에는 따로 적지 않는다.

검증 실패가 여러 개여도 응답은 `VALIDATION_FAILED` 하나다. 같은 요청에 검증 실패와 업무 오류가 함께 있으면 검증 실패를 먼저 돌려준다.

## 3. 인증

### POST /api/auth/login

로그인 없이 호출한다.

| 필드 | 타입 | 필수 |
|---|---|---|
| `loginId` | string | O |
| `password` | string | O |

```json
{ "loginId": "admin", "password": "test1234!" }
```

200. 세션 쿠키를 발급한다. 본문은 `GET /api/auth/me` 와 같다.
오류: 400 `VALIDATION_FAILED`(값이 없거나 빈 문자열), 401 `AUTH_FAILED`(ID 없음, 비밀번호 불일치, 비활성 계정). 로그인 ID 형식과 비밀번호 길이는 검사하지 않는다.

### POST /api/auth/logout

204. 본문 없음. 오류: 401 `AUTH_REQUIRED`.

### GET /api/auth/me

```json
{
  "id": 1,
  "loginId": "admin",
  "name": "김지훈",
  "role": "ADMIN",
  "permissions": ["MEMBER_READ", "MEMBER_WRITE", "ORDER_READ", "ORDER_WRITE", "DELIVERY_READ",
                  "DELIVERY_WRITE", "REFUND_READ", "REFUND_WRITE", "STAFF_READ", "STAFF_WRITE"]
}
```

`permissions` 는 `requirements.md` §5 의 권한 이름 순서(MEMBER, ORDER, DELIVERY, REFUND, STAFF, 각 READ 다음 WRITE)로 정렬한다. 오류: 401 `AUTH_REQUIRED`.

## 4. 회원

회원 응답(`Member`):

```json
{
  "id": 5,
  "name": "안우진",
  "email": "member05@example.com",
  "grade": "GENERAL",
  "status": "ACTIVE",
  "joinedAt": "2024-05-20T05:00:00+09:00",
  "lastLoginAt": "2024-12-11T08:00:00+09:00",
  "withdrawnAt": null
}
```

| endpoint | 권한 | 요청 | 응답 | 오류 |
|---|---|---|---|---|
| `GET /api/admin/members` | MEMBER_READ | - | 200 `Member[]`, ID 오름차순 | - |
| `GET /api/admin/members/{id}` | MEMBER_READ | - | 200 `Member` | 404 `MEMBER_NOT_FOUND` |
| `PATCH /api/admin/members/{id}/status` | MEMBER_WRITE | `{ "status": "SUSPENDED" }` (`ACTIVE` 또는 `SUSPENDED`, 필수) | 200 `Member` | 400, 404, 409 `MEMBER_WITHDRAWN` |
| `PATCH /api/admin/members/{id}/grade` | MEMBER_WRITE | `{ "grade": "VIP" }` (필수) | 200 `Member` | 400, 404, 409 `MEMBER_WITHDRAWN` |
| `POST /api/admin/members/{id}/withdraw` | MEMBER_WRITE | 본문 없음 | 200 `Member` | 404, 409 `MEMBER_WITHDRAWN` |

## 5. 주문

### 주문 요청 본문

`POST /api/orders/preview` 와 `POST /api/orders` 가 같은 본문을 받는다.

| 필드 | 타입 | 필수 |
|---|---|---|
| `memberId` | number | O |
| `lines` | array, 1개 이상 | O |
| `lines[].productName` | string, 1 ~ 100자 | O |
| `lines[].unitPrice` | number, 0 이상 | O |
| `lines[].quantity` | number, 1 이상 | O |

```json
{
  "memberId": 4,
  "lines": [
    { "productName": "27인치 모니터", "unitPrice": 289000, "quantity": 1 },
    { "productName": "데스크 매트", "unitPrice": 19000, "quantity": 1 }
  ]
}
```

### 주문 응답

주문 요약(`OrderSummary`):

```json
{
  "id": 1001,
  "memberId": 4,
  "status": "PENDING_PAYMENT",
  "productAmount": 308000,
  "deliveryFee": 0,
  "totalAmount": 308000,
  "createdAt": "2026-01-15T10:00:00+09:00",
  "paidAt": null,
  "expiredAt": null
}
```

주문 상세(`OrderDetail`)는 `OrderSummary` 에 `lines` 를 더한다.

```json
"lines": [
  { "productName": "27인치 모니터", "unitPrice": 289000, "quantity": 1, "lineAmount": 289000 },
  { "productName": "데스크 매트", "unitPrice": 19000, "quantity": 1, "lineAmount": 19000 }
]
```

`lines` 는 주문 상품 ID 오름차순이다.

### Endpoint

| endpoint | 권한 | 요청 | 응답 | 오류 |
|---|---|---|---|---|
| `POST /api/orders/preview` | 없음 | 주문 요청 본문 | 200 `{ "memberId": 4, "productAmount": 308000, "deliveryFee": 0, "totalAmount": 308000 }` | 400, 404 `MEMBER_NOT_FOUND`, 409 `MEMBER_NOT_ORDERABLE` |
| `POST /api/orders` | 없음 | 주문 요청 본문 | 201 `OrderDetail` | 400, 404 `MEMBER_NOT_FOUND`, 409 `MEMBER_NOT_ORDERABLE` |
| `POST /api/orders/{id}/pay` | 없음 | 본문 없음 | 200 `OrderDetail` | 404 `ORDER_NOT_FOUND`, 409 `ORDER_STATE_INVALID`, 409 `ORDER_PAYMENT_EXPIRED` |
| `GET /api/admin/orders` | ORDER_READ | - | 200 `OrderSummary[]`, ID 내림차순 | - |
| `GET /api/admin/orders/{id}` | ORDER_READ | - | 200 `OrderDetail` | 404 `ORDER_NOT_FOUND` |
| `POST /api/admin/orders/expire-overdue` | ORDER_WRITE | 본문 없음 | 200 `{ "expiredCount": 2 }` | - |

## 6. 배송

배송 응답(`Delivery`):

```json
{
  "id": 100,
  "orderId": 112,
  "status": "READY",
  "fee": 3000,
  "createdAt": "2026-01-15T06:46:00+09:00",
  "shippedAt": null,
  "deliveredAt": null
}
```

| endpoint | 권한 | 요청 | 응답 | 오류 |
|---|---|---|---|---|
| `GET /api/admin/deliveries` | DELIVERY_READ | - | 200 `Delivery[]`, ID 내림차순 | - |
| `PATCH /api/admin/deliveries/{id}/status` | DELIVERY_WRITE | `{ "status": "SHIPPED" }` (필수) | 200 `Delivery` | 400, 404 `DELIVERY_NOT_FOUND`, 409 `DELIVERY_STATE_INVALID` |
| `GET /api/admin/delivery-policy` | DELIVERY_READ | - | 200 `{ "baseFee": 3000, "vipFreeShippingThreshold": 150000 }` | - |

## 7. 환불

환불 응답(`Refund`):

```json
{
  "id": 1001,
  "orderId": 1001,
  "amount": 20000,
  "partial": true,
  "reason": "단순 변심",
  "status": "APPROVED",
  "deliveryFeeDeduction": 3000,
  "refundedAmount": 17000,
  "requestedAt": "2026-01-15T10:00:00+09:00",
  "processedAt": "2026-01-15T10:00:00+09:00"
}
```

`REQUESTED` · `REJECTED` 환불의 `deliveryFeeDeduction`, `refundedAmount` 는 `null` 이다.

환불 요청 본문:

| 필드 | 타입 | 필수 |
|---|---|---|
| `orderId` | number | O |
| `amount` | number, 1 이상 | O |
| `reason` | string, 1 ~ 200자 | O |

| endpoint | 권한 | 요청 | 응답 | 오류 |
|---|---|---|---|---|
| `GET /api/admin/refunds` | REFUND_READ | - | 200 `Refund[]`, ID 내림차순 | - |
| `POST /api/admin/refunds` | REFUND_WRITE | 환불 요청 본문 | 201 `Refund`(`REQUESTED`) | 400, 404 `ORDER_NOT_FOUND`, 409 `REFUND_ORDER_NOT_PAID`, 409 `REFUND_STATE_INVALID`, 409 `REFUND_ALREADY_REQUESTED`, 409 `REFUND_AMOUNT_EXCEEDED` |
| `POST /api/admin/refunds/{id}/approve` | REFUND_WRITE | 본문 없음 | 200 `Refund`(`APPROVED`) | 404 `REFUND_NOT_FOUND`, 409 `REFUND_ALREADY_PROCESSED` |
| `POST /api/admin/refunds/{id}/reject` | REFUND_WRITE | 본문 없음 | 200 `Refund`(`REJECTED`) | 404 `REFUND_NOT_FOUND`, 409 `REFUND_ALREADY_PROCESSED` |

환불 요청 오류는 `requirements.md` §3.5 의 순서로 확인한다.

## 8. 관리자 계정

관리자 계정 응답(`Staff`). 비밀번호 값은 응답에 넣지 않는다.

```json
{
  "id": 1,
  "loginId": "admin",
  "name": "김지훈",
  "department": "운영팀",
  "role": "ADMIN",
  "active": true,
  "createdAt": "2024-10-02T10:00:00+09:00"
}
```

관리자 계정 생성 본문:

| 필드 | 타입 | 필수 |
|---|---|---|
| `loginId` | string, 4 ~ 30자, 영문 소문자 · 숫자 · `.` · `_` | O |
| `name` | string, 1 ~ 50자 | O |
| `department` | string, 1 ~ 200자 | O |
| `role` | `ADMIN` 또는 `OPERATOR` | O |
| `password` | string, 8 ~ 64자 | O |

| endpoint | 권한 | 요청 | 응답 | 오류 |
|---|---|---|---|---|
| `GET /api/admin/staff` | STAFF_READ | - | 200 `Staff[]`, ID 오름차순 | - |
| `POST /api/admin/staff` | STAFF_WRITE | 생성 본문 | 201 `Staff` | 400, 409 `STAFF_LOGIN_ID_DUPLICATED` |
| `PATCH /api/admin/staff/{id}/role` | STAFF_WRITE | `{ "role": "ADMIN" }` (필수) | 200 `Staff` | 400, 404 `STAFF_NOT_FOUND` |
| `POST /api/admin/staff/{id}/deactivate` | STAFF_WRITE | 본문 없음 | 200 `Staff` | 404 `STAFF_NOT_FOUND` |

## 9. 인증 · 권한 오류

`/api/admin/**`, `POST /api/auth/logout`, `GET /api/auth/me` 는 로그인하지 않으면 401 `AUTH_REQUIRED` 다. `/api/admin/**` 는 권한이 없으면 403 `ACCESS_DENIED` 다. 인증 · 권한 확인은 입력 검증보다 먼저 한다.
