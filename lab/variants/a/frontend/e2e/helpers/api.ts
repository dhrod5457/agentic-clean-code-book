import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { TEST_PASSWORD } from './session';

// E2E 데이터는 화면 클릭이 아니라 API 로 만든다.
// api 는 Playwright 의 `request` fixture(baseURL 설정됨)다. 쿠키는 그 context 안에 남는다.

export type Role = 'ADMIN' | 'OPERATOR';

export interface OrderLineInput {
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface CreatedOrder {
  id: number;
  memberId: number;
  status: string;
  productAmount: number;
  deliveryFee: number;
  totalAmount: number;
}

export interface CreatedStaff {
  id: number;
  loginId: string;
  name: string;
  department: string;
  role: Role;
  active: boolean;
}

export interface CreatedRefund {
  id: number;
  orderId: number;
  amount: number;
  partial: boolean;
  status: string;
}

async function expectStatus(response: APIResponse, status: number) {
  expect(response.status(), `${response.url()} 응답: ${await response.text()}`).toBe(status);
}

/** api context 를 admin 세션으로 만든다. */
async function loginAsAdmin(api: APIRequestContext) {
  const response = await api.post('/api/auth/login', {
    data: { loginId: 'admin', password: TEST_PASSWORD },
  });
  await expectStatus(response, 200);
}

/** 실행마다 겹치지 않는 로그인 ID(영문 소문자 · 숫자 · `.`, 30자 이하) */
export function uniqueLoginId(prefix: string): string {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  return `${prefix}.${suffix}`.slice(0, 30);
}

/** admin 권한으로 관리자 계정을 만든다. */
export async function createStaff(
  api: APIRequestContext,
  body: { loginId: string; name: string; department: string; role: Role; password: string },
): Promise<CreatedStaff> {
  await loginAsAdmin(api);
  const response = await api.post('/api/admin/staff', { data: body });
  await expectStatus(response, 201);
  return (await response.json()) as CreatedStaff;
}

/** 주문을 만든다(로그인 없이 호출). */
export async function createOrder(
  api: APIRequestContext,
  memberId: number,
  lines: OrderLineInput[],
): Promise<CreatedOrder> {
  const response = await api.post('/api/orders', { data: { memberId, lines } });
  await expectStatus(response, 201);
  return (await response.json()) as CreatedOrder;
}

/** 모의 결제를 완료한다(로그인 없이 호출). */
export async function payOrder(api: APIRequestContext, orderId: number): Promise<CreatedOrder> {
  const response = await api.post(`/api/orders/${orderId}/pay`);
  await expectStatus(response, 200);
  return (await response.json()) as CreatedOrder;
}

/** admin 권한으로 환불을 요청한다. */
export async function requestRefund(
  api: APIRequestContext,
  body: { orderId: number; amount: number; reason: string },
): Promise<CreatedRefund> {
  await loginAsAdmin(api);
  const response = await api.post('/api/admin/refunds', { data: body });
  await expectStatus(response, 201);
  return (await response.json()) as CreatedRefund;
}
