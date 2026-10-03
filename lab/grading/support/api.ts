import { test as base, expect, request as pwRequest, type APIRequestContext, type APIResponse } from '@playwright/test';

export const BASE_URL = process.env.GRADING_BASE_URL ?? 'http://localhost:18080';
export const PASSWORD = 'test1234!';

// api.md §2 의 오류 표
export const ERRORS: Record<string, { status: number; message: string }> = {
  VALIDATION_FAILED: { status: 400, message: '요청 값이 올바르지 않습니다.' },
  AUTH_REQUIRED: { status: 401, message: '로그인이 필요합니다.' },
  AUTH_FAILED: { status: 401, message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
  ACCESS_DENIED: { status: 403, message: '권한이 없습니다.' },
  MEMBER_NOT_FOUND: { status: 404, message: '회원을 찾을 수 없습니다.' },
  MEMBER_WITHDRAWN: { status: 409, message: '탈퇴한 회원입니다.' },
  MEMBER_NOT_ORDERABLE: { status: 409, message: '주문할 수 없는 회원 상태입니다.' },
  ORDER_NOT_FOUND: { status: 404, message: '주문을 찾을 수 없습니다.' },
  ORDER_STATE_INVALID: { status: 409, message: '결제 대기 상태의 주문만 결제할 수 있습니다.' },
  ORDER_PAYMENT_EXPIRED: { status: 409, message: '결제 기한이 지난 주문입니다.' },
  DELIVERY_NOT_FOUND: { status: 404, message: '배송을 찾을 수 없습니다.' },
  DELIVERY_STATE_INVALID: { status: 409, message: '변경할 수 없는 배송 상태입니다.' },
  REFUND_NOT_FOUND: { status: 404, message: '환불을 찾을 수 없습니다.' },
  REFUND_ORDER_NOT_PAID: { status: 409, message: '결제 완료된 주문만 환불을 요청할 수 있습니다.' },
  REFUND_STATE_INVALID: { status: 409, message: '배송 중인 주문은 환불을 요청할 수 없습니다.' },
  REFUND_ALREADY_REQUESTED: { status: 409, message: '처리 중인 환불 요청이 있습니다.' },
  REFUND_AMOUNT_EXCEEDED: { status: 409, message: '환불 가능 금액을 넘었습니다.' },
  REFUND_ALREADY_PROCESSED: { status: 409, message: '이미 처리된 환불입니다.' },
  STAFF_NOT_FOUND: { status: 404, message: '관리자 계정을 찾을 수 없습니다.' },
  STAFF_LOGIN_ID_DUPLICATED: { status: 409, message: '이미 사용 중인 로그인 ID 입니다.' },
  NOT_FOUND: { status: 404, message: '요청한 경로를 찾을 수 없습니다.' },
  METHOD_NOT_ALLOWED: { status: 405, message: '지원하지 않는 요청 방식입니다.' },
  INTERNAL_ERROR: { status: 500, message: '서버 오류가 발생했습니다.' },
};

export interface OrderSummary {
  id: number;
  memberId: number;
  status: string;
  productAmount: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
  expiredAt: string | null;
}
export interface OrderDetail extends OrderSummary {
  lines: { productName: string; unitPrice: number; quantity: number; lineAmount: number }[];
}
export interface Delivery {
  id: number;
  orderId: number;
  status: string;
  fee: number;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}
export interface Refund {
  id: number;
  orderId: number;
  amount: number;
  partial: boolean;
  reason: string;
  status: string;
  deliveryFeeDeduction: number | null;
  refundedAmount: number | null;
  requestedAt: string;
  processedAt: string | null;
}
export interface Member {
  id: number;
  name: string;
  email: string;
  grade: string;
  status: string;
  joinedAt: string;
  lastLoginAt: string;
  withdrawnAt: string | null;
}
export interface Staff {
  id: number;
  loginId: string;
  name: string;
  department: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export const ORDER_SUMMARY_KEYS = ['id', 'memberId', 'status', 'productAmount', 'deliveryFee', 'totalAmount', 'createdAt', 'paidAt', 'expiredAt'];
export const DELIVERY_KEYS = ['id', 'orderId', 'status', 'fee', 'createdAt', 'shippedAt', 'deliveredAt'];
export const REFUND_KEYS = ['id', 'orderId', 'amount', 'partial', 'reason', 'status', 'deliveryFeeDeduction', 'refundedAmount', 'requestedAt', 'processedAt'];
export const MEMBER_KEYS = ['id', 'name', 'email', 'grade', 'status', 'joinedAt', 'lastLoginAt', 'withdrawnAt'];
export const STAFF_KEYS = ['id', 'loginId', 'name', 'department', 'role', 'active', 'createdAt'];

export async function anonymous(): Promise<APIRequestContext> {
  return pwRequest.newContext({ baseURL: BASE_URL });
}

export async function loginAs(loginId: string, password = PASSWORD): Promise<APIRequestContext> {
  const ctx = await anonymous();
  const res = await ctx.post('/api/auth/login', { data: { loginId, password } });
  expect(res.status(), `${loginId} 로그인`).toBe(200);
  return ctx;
}

export async function body<T>(res: APIResponse, status = 200): Promise<T> {
  expect(res.status(), `${res.url()} → ${await res.text()}`).toBe(status);
  return (await res.json()) as T;
}

// 오류 응답을 { status, body } 로 읽는다. 시험은 err(code) 와 비교한다
export async function errorOf(res: APIResponse): Promise<{ status: number; body: unknown }> {
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // JSON 이 아니면 원문 그대로 비교해 실패 메시지에 남긴다
  }
  return { status: res.status(), body: parsed };
}

export function err(code: string): { status: number; body: { code: string; message: string } } {
  const e = ERRORS[code];
  if (!e) throw new Error(`unknown error code ${code}`);
  return { status: e.status, body: { code, message: e.message } };
}

export function expectKeys(obj: object, keys: string[]): void {
  expect(Object.keys(obj).sort()).toEqual([...keys].sort());
}

export const test = base.extend<{ anon: APIRequestContext; admin: APIRequestContext; operator: APIRequestContext }>({
  anon: async ({}, use) => {
    const ctx = await anonymous();
    await use(ctx);
    await ctx.dispose();
  },
  admin: async ({}, use) => {
    const ctx = await loginAs('admin');
    await use(ctx);
    await ctx.dispose();
  },
  operator: async ({}, use) => {
    const ctx = await loginAs('operator');
    await use(ctx);
    await ctx.dispose();
  },
});
export { expect };

export function lines(amount: number) {
  return [{ productName: '채점 상품', unitPrice: amount, quantity: 1 }];
}

export async function createOrder(ctx: APIRequestContext, memberId: number, amount: number): Promise<OrderDetail> {
  return body<OrderDetail>(await ctx.post('/api/orders', { data: { memberId, lines: lines(amount) } }), 201);
}

export async function payOrder(ctx: APIRequestContext, orderId: number): Promise<OrderDetail> {
  return body<OrderDetail>(await ctx.post(`/api/orders/${orderId}/pay`));
}

export async function createPaidOrder(ctx: APIRequestContext, memberId: number, amount: number): Promise<OrderDetail> {
  const order = await createOrder(ctx, memberId, amount);
  return payOrder(ctx, order.id);
}

export async function deliveryOfOrder(admin: APIRequestContext, orderId: number): Promise<Delivery> {
  const all = await body<Delivery[]>(await admin.get('/api/admin/deliveries'));
  const d = all.find((x) => x.orderId === orderId);
  expect(d, `주문 ${orderId} 의 배송`).toBeTruthy();
  return d!;
}

export async function setDeliveryStatus(ctx: APIRequestContext, deliveryId: number, status: string): Promise<APIResponse> {
  return ctx.patch(`/api/admin/deliveries/${deliveryId}/status`, { data: { status } });
}

export async function requestRefund(admin: APIRequestContext, orderId: number, amount: number): Promise<APIResponse> {
  return admin.post('/api/admin/refunds', { data: { orderId, amount, reason: '채점 환불' } });
}

export async function approveRefund(admin: APIRequestContext, refundId: number): Promise<Refund> {
  return body<Refund>(await admin.post(`/api/admin/refunds/${refundId}/approve`));
}

export async function requestAndApprove(admin: APIRequestContext, orderId: number, amount: number): Promise<Refund> {
  const r = await body<Refund>(await requestRefund(admin, orderId, amount), 201);
  return approveRefund(admin, r.id);
}
