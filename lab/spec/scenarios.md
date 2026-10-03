# 행동 시나리오

시험 하나는 시나리오 ID 하나에 대응한다. 시험 이름 앞에 ID 를 넣는다(`conventions.md` §7).

## 1. 열 설명

| 열 | 뜻 |
|---|---|
| ID | `<영역 3글자>-<두 자리 번호>`. 한 번 정한 ID 는 바꾸거나 다시 쓰지 않는다 |
| 단계 | 시험을 두는 단계. `unit` Spring 없는 단위 시험, `web` `@WebMvcTest`, `integration` `@SpringBootTest`, `component` jsdom component 시험, `e2e` Playwright |
| 입력 → 기대 | 시험의 입력 값과 기대 결과. 기준 시각은 `2026-01-15T10:00:00+09:00` |
| 외부 확인 | 애플리케이션을 띄운 상태에서 HTTP 나 화면으로 같은 동작을 확인할 수 있는지. `HTTP`, `화면`, `불가(이유)` |

`web` 시험의 권한 확인은 `SecurityConfig` 를 포함한 slice 로 한다.

## 2. 배송(DLV)

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| DLV-01 | unit | VIP, 상품 금액 150,000원 → 배송비 0원 | HTTP |
| DLV-02 | unit | VIP, 149,999원 → 3,000원 | HTTP |
| DLV-03 | unit | GENERAL, 150,000원 → 3,000원 | HTTP |
| DLV-04 | web | `GET /api/admin/delivery-policy` → 200 `{ "baseFee": 3000, "vipFreeShippingThreshold": 150000 }` | HTTP |
| DLV-05 | unit | `READY` 배송을 `SHIPPED` 로 변경 → 상태 `SHIPPED`, `shippedAt` 이 현재 시각 | HTTP |
| DLV-06 | unit | `SHIPPED` 배송을 `DELIVERED` 로 변경 → 상태 `DELIVERED`, `deliveredAt` 이 현재 시각 | HTTP |
| DLV-07 | unit | `READY → DELIVERED`, `DELIVERED → SHIPPED`, `SHIPPED → READY` → 각각 `DELIVERY_STATE_INVALID` | HTTP |
| DLV-08 | web | `PATCH /api/admin/deliveries/{id}/status` 에 `{ "status": "LOST" }` → 400 `VALIDATION_FAILED` | HTTP |
| DLV-09 | web | `GET /api/admin/deliveries` → ID 내림차순 배열, 각 항목에 `api.md` §6 의 필드 | HTTP |
| DLV-10 | component | 배송 목록: `READY` 행에 "출고 처리", `SHIPPED` 행에 "도착 처리", `DELIVERED` 행에 버튼 없음. `DELIVERY_WRITE` 가 없으면 버튼 없음 | 화면 |
| DLV-11 | component | 배송 정책 화면: "기본 배송비" 3,000원, "VIP 무료배송 기준 금액" 150,000원 표시 | 화면 |

## 3. 주문(ORD)

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| ORD-01 | unit | 상품 289,000원 × 1, 19,000원 × 2 → 상품 금액 327,000원 | HTTP |
| ORD-02 | unit | VIP 회원, 상품 금액 308,000원으로 주문 생성 → 배송비 0원, 결제 금액 308,000원, 상태 `PENDING_PAYMENT`, `createdAt` 이 현재 시각 | HTTP |
| ORD-03 | web | `POST /api/orders/preview` → 200, 금액 3개를 돌려주고 주문을 저장하지 않는다 | HTTP |
| ORD-04 | web | 단가 -1 인 주문 생성 → 400 `VALIDATION_FAILED` | HTTP |
| ORD-05 | web | `memberId` 없는 주문 생성 → 400 `VALIDATION_FAILED` | HTTP |
| ORD-06 | unit | `SUSPENDED` 회원과 `WITHDRAWN` 회원으로 주문 생성 → 각각 `MEMBER_NOT_ORDERABLE` | HTTP |
| ORD-07 | unit | `PENDING_PAYMENT` 주문 결제(생성 후 10분) → 상태 `PAID`, `paidAt` 기록, 주문 배송비와 같은 `fee` 의 `READY` 배송 생성 | HTTP |
| ORD-08 | unit | `PAID` 주문 결제 → `ORDER_STATE_INVALID` | HTTP |
| ORD-09 | unit | 생성 후 30분이 된 `PENDING_PAYMENT` 주문 결제 → `ORDER_PAYMENT_EXPIRED`, 상태는 `PENDING_PAYMENT` 그대로 | HTTP(seed 의 기한이 지난 결제 대기 주문으로 확인. 시계가 고정이라 새 주문으로는 불가) |
| ORD-10 | unit | 만료 처리: 생성 후 30분이 된 주문은 `EXPIRED`(`expiredAt` 기록), 29분 59초인 주문은 `PENDING_PAYMENT` 그대로, 결과 건수는 바꾼 주문 수 | HTTP(일부. seed 상태에서 `expiredCount` 2. 30분 · 29분 59초 경계는 시계가 고정이라 불가) |
| ORD-11 | web | `GET /api/admin/orders/{id}` → `OrderDetail`, `lines` 의 `lineAmount = unitPrice × quantity` | HTTP |
| ORD-12 | unit | 배송비 3,000원으로 저장된 VIP 회원 주문(상품 금액 160,000원)을 조회 → 배송비 3,000원 그대로. 저장된 값을 다시 계산하지 않는다 | 불가(기준이나 저장된 배송비를 바꾸는 API 가 없다) |
| ORD-13 | component | 주문 목록: `ui.md` §5.4 의 열과 상태 이름, 금액 형식 | 화면 |
| ORD-14 | component | 주문 상세: 주문 정보와 상품 표 | 화면 |
| ORD-15 | web | `GET /api/admin/orders` → ID 내림차순 배열 | HTTP |
| ORD-16 | unit | 상품 금액이나 결제 금액이 `long` 범위를 넘으면 `VALIDATION_FAILED`. GENERAL 회원 상품 금액 `Long.MAX_VALUE − 3,000` 은 결제 금액이 정확히 `Long.MAX_VALUE`, `Long.MAX_VALUE − 2,999` 는 실패, VIP 회원 상품 금액 `Long.MAX_VALUE`(배송비 0원)는 성공. 실패하면 저장하지 않는다 | 불가(경계값은 단위 시험으로 본다) |
| ORD-17 | web | GENERAL 회원 단가 `9223372036854775807` × 1 주문 생성 · 미리보기 → 400 `VALIDATION_FAILED` | HTTP |

## 4. 환불(RFD)

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| RFD-01 | unit | `PAID` 주문(상품 금액 100,000원, 배송 `READY`)에 30,000원 환불 요청 → `REQUESTED`, `partial: true` | HTTP |
| RFD-02 | unit | 배송 `SHIPPED` 인 주문에 환불 요청 → `REFUND_STATE_INVALID` | HTTP |
| RFD-03 | unit | `PENDING_PAYMENT` 주문과 `EXPIRED` 주문에 환불 요청 → 각각 `REFUND_ORDER_NOT_PAID` | HTTP |
| RFD-04 | unit | 상품 금액 100,000원, 승인된 환불 70,000원인 주문에 40,000원 요청 → `REFUND_AMOUNT_EXCEEDED` | HTTP |
| RFD-05 | unit | `REQUESTED` 환불이 있는 주문에 다시 요청 → `REFUND_ALREADY_REQUESTED` | HTTP |
| RFD-06 | unit | VIP 회원의 160,000원 주문(배송비 0원)에서 20,000원 부분 환불 승인 → 차감액 3,000원, 환불 금액 17,000원 | HTTP |
| RFD-07 | unit | VIP 회원의 200,000원 주문(배송비 0원)에서 20,000원 부분 환불 승인 → 남은 금액 180,000원, 차감액 0원, 환불 금액 20,000원 | HTTP |
| RFD-08 | unit | 배송비 3,000원으로 저장된 주문(상품 금액 100,000원)에서 30,000원 부분 환불 승인 → 차감액 0원 | HTTP |
| RFD-09 | unit | VIP 회원의 308,000원 주문(배송비 0원)에서 289,000원 승인(차감 3,000원) 뒤 19,000원 승인 → 둘째 환불 차감액 0원 | HTTP |
| RFD-10 | unit | VIP 회원의 152,000원 주문(배송비 0원)에서 2,500원 부분 환불 승인 → 남은 금액 149,500원, 차감액 2,500원, 환불 금액 0원 | HTTP |
| RFD-11 | unit | `REQUESTED` 환불 거절 → `REJECTED`, `processedAt` 기록, 차감액 · 환불 금액 `null` | HTTP |
| RFD-12 | unit | `APPROVED` 환불의 승인과 거절, `REJECTED` 환불의 승인 → 각각 `REFUND_ALREADY_PROCESSED` | HTTP |
| RFD-13 | unit | VIP 회원의 160,000원 주문(배송비 0원)에서 160,000원 전체 환불 승인 → `partial: false`, 차감액 0원 | HTTP |
| RFD-14 | web | `GET /api/admin/refunds` → ID 내림차순 배열 | HTTP |
| RFD-15 | component | 환불 목록: `REQUESTED` 행에 "승인", "거절" 버튼. 그 밖의 행에 버튼 없음. `REFUND_WRITE` 가 없으면 버튼과 "환불 요청 등록" 없음 | 화면 |
| RFD-16 | web | 환불 요청 본문에서 `reason` 이 빈 문자열 → 400 `VALIDATION_FAILED` | HTTP |
| RFD-17 | integration | `RefundFlowIT`: 같은 `REQUESTED` 환불에 승인 · 거절을 동시에 4번 → 하나만 성공, 나머지 409 `REFUND_ALREADY_PROCESSED`. 결과 행의 상태와 금액이 처리한 요청과 맞다 | 불가(동시 요청의 순서를 HTTP 로 고정할 수 없다) |
| RFD-18 | integration | `RefundFlowIT`: 같은 `PAID` 주문에 환불 요청을 동시에 4번 → 하나만 201, 나머지 409 `REFUND_ALREADY_REQUESTED`. `REQUESTED` 환불은 1개 | 불가(동시 요청의 순서를 HTTP 로 고정할 수 없다) |
| RFD-19 | unit | 승인 · 거절의 상태 변경이 `REQUESTED` 행을 바꾸지 못하면(다른 요청이 먼저 처리) 409 `REFUND_ALREADY_PROCESSED` | 불가(내부 경합 상황) |

## 5. 회원(MBR)

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| MBR-01 | unit | `ACTIVE` 회원을 `SUSPENDED` 로 변경 → 상태 `SUSPENDED` | HTTP |
| MBR-02 | unit | `SUSPENDED` 회원을 `ACTIVE` 로 변경 → 상태 `ACTIVE` | HTTP |
| MBR-03 | unit | `GENERAL` 회원 등급을 `VIP` 로 변경 → 등급 `VIP` | HTTP |
| MBR-04 | unit | `ACTIVE` 회원 탈퇴 처리 → 상태 `WITHDRAWN`, `withdrawnAt` 이 현재 시각 | HTTP |
| MBR-05 | unit | `WITHDRAWN` 회원의 상태 변경, 등급 변경, 탈퇴 처리 → 각각 `MEMBER_WITHDRAWN` | HTTP |
| MBR-06 | web | 상태 변경 본문 `{ "status": "WITHDRAWN" }` → 400 `VALIDATION_FAILED` | HTTP |
| MBR-07 | web | `GET /api/admin/members/9999` → 404 `MEMBER_NOT_FOUND` | HTTP |
| MBR-08 | web | `GET /api/admin/members` → ID 오름차순 배열, 각 항목에 `api.md` §4 의 필드 | HTTP |
| MBR-09 | component | 회원 목록: `ui.md` §5.2 의 열과 등급 · 상태 이름 | 화면 |
| MBR-10 | component | 회원 상세: `ACTIVE` 회원에 "정지", `SUSPENDED` 회원에 "정지 해제", 탈퇴하지 않은 회원에 등급 변경 버튼과 "탈퇴 처리". `MEMBER_WRITE` 가 없거나 탈퇴 회원이면 버튼 없음 | 화면 |

## 6. 관리자 계정(STF)

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| STF-01 | unit | 관리자 계정 생성 → `active: true`, `createdAt` 이 현재 시각, 저장된 비밀번호가 원문이 아니고 `PasswordEncoder.matches` 로 일치 | HTTP(일부. 새 계정으로 로그인 성공까지. 저장 형식은 불가) |
| STF-02 | unit | 이미 있는 로그인 ID 로 생성 → `STAFF_LOGIN_ID_DUPLICATED` | HTTP |
| STF-03 | unit | `OPERATOR` 를 `ADMIN` 으로 역할 변경 → 역할 `ADMIN` | HTTP |
| STF-04 | unit | 활성 계정 비활성화 → `active: false`. 비활성 계정을 다시 비활성화 → 그대로 `active: false` | HTTP |
| STF-05 | web | 부서명 201자로 생성 → 400 `VALIDATION_FAILED`. 200자는 201 | HTTP |
| STF-06 | web | `GET /api/admin/staff` → ID 오름차순 배열, 응답에 비밀번호 필드 없음 | HTTP |
| STF-07 | component | 관리자 계정 목록: `ui.md` §5.9 의 열, 활성 계정 행에 "수정", "비활성화" 버튼. `STAFF_WRITE` 가 없으면 버튼과 "관리자 계정 추가" 없음 | 화면 |
| STF-08 | web | 로그인 ID `AB` 로 생성 → 400 `VALIDATION_FAILED` | HTTP |

## 7. 인증과 권한(AUT)

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| AUT-01 | web | `admin` / `test1234!` 로그인 → 200, 권한 10개, 세션 쿠키 발급 | HTTP |
| AUT-02 | web | `admin` / 틀린 비밀번호 → 401 `AUTH_FAILED` | HTTP |
| AUT-03 | web | 비활성 계정 `oh.log` / `test1234!` → 401 `AUTH_FAILED` | HTTP |
| AUT-04 | web | 로그인 없이 `GET /api/admin/members` → 401 `AUTH_REQUIRED` | HTTP |
| AUT-05 | web | `operator` 로 `PATCH /api/admin/members/{id}/grade` → 403 `ACCESS_DENIED` | HTTP |
| AUT-06 | web | `operator` 로 `READY` 배송에 `PATCH /api/admin/deliveries/{id}/status` `{ "status": "SHIPPED" }` → 200 | HTTP |
| AUT-07 | web | 로그아웃 후 `GET /api/auth/me` → 401 `AUTH_REQUIRED` | HTTP |
| AUT-08 | web | `operator` 로 `GET /api/auth/me` → `permissions` 가 `_READ` 다섯 개와 `DELIVERY_WRITE` | HTTP |
| AUT-09 | component | 로그인 화면: 로그인 실패 시 응답 `message` 를 표시 | 화면 |
| AUT-10 | component | 메뉴: 권한이 있는 메뉴 항목만 `ui.md` §3 의 그룹 순서와 항목 순서로 표시 | 화면 |
| AUT-11 | web | `operator` 로그인 상태에서 그 계정의 역할을 `ADMIN` 으로 바꾼 뒤 같은 세션으로 `PATCH /api/admin/members/{id}/grade` → 200. 그 계정을 비활성화한 뒤 같은 세션으로 `GET /api/auth/me` → 401 `AUTH_REQUIRED` | HTTP |
| AUT-12 | web | 로그인 본문 `{ "loginId": "AB", "password": "x" }` → 401 `AUTH_FAILED`. `{ "loginId": "", "password": "x" }` → 400 `VALIDATION_FAILED` | HTTP |

## 8. 흐름(FLW)

통합 시험 class 는 `CheckoutFlowIT`, `RefundFlowIT` 두 개다. 실제 Spring context 와 H2 를 쓴다. `RefundFlowIT` 에는 RFD-17 · RFD-18 도 들어간다.

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| FLW-01 | integration | `CheckoutFlowIT`: VIP 회원 주문 생성(308,000원) → 결제 → 주문 `PAID`, 배송 `READY`, 배송 `fee` 0원 | HTTP |
| FLW-02 | integration | `RefundFlowIT`: VIP 회원 주문 생성(160,000원) → 결제 → 20,000원 환불 요청 → 승인 → 차감액 3,000원, 환불 금액 17,000원 | HTTP |

## 9. 화면 흐름(E2E)

단일 port 로 실행한 애플리케이션에 Playwright 로 접속한다.

| ID | 단계 | 입력 → 기대 | 외부 확인 |
|---|---|---|---|
| E2E-01 | e2e | `admin` 로그인 → 회원 목록 화면, 메뉴 그룹 5개 표시 | 화면 |
| E2E-02 | e2e | `operator` 로그인 → 회원 상세에 쓰기 버튼 없음, 배송 목록에 "출고 처리" 버튼 있음 | 화면 |
| E2E-03 | e2e | `admin` 이 "관리자 계정 추가" 로 계정을 만든다 → 목록에 새 계정 표시 | 화면 |
| E2E-04 | e2e | API 로 주문 생성 · 결제 → 배송 목록에서 "출고 처리" → 상태 "배송 중" | 화면 |
| E2E-05 | e2e | API 로 VIP 회원 160,000원 주문 생성 · 결제 · 20,000원 환불 요청 → 환불 목록에서 "승인" → 배송비 차감 "3,000원", 환불 금액 "17,000원" | 화면 |
