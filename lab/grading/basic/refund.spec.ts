import {
  REFUND_KEYS, body, createOrder, createPaidOrder, deliveryOfOrder, err, errorOf, expect, expectKeys,
  requestAndApprove, requestRefund, setDeliveryStatus, test, type Refund,
} from '../support/api';
import { T0, activeGenerals, activeVips, seed } from '../support/seed';

const VIP = activeVips[0].id;
const GENERAL = activeGenerals[0].id;
const expiredOrder = seed.orders.find((o) => o.status === 'EXPIRED')!.id;

test('[RFD-01] 결제 완료 · 출고 대기 주문의 환불 요청', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 100_000);
  const r = await body<Refund>(await requestRefund(admin, order.id, 30_000), 201);
  expect(r).toMatchObject({
    orderId: order.id, amount: 30000, partial: true, reason: '채점 환불', status: 'REQUESTED',
    deliveryFeeDeduction: null, refundedAmount: null, requestedAt: T0, processedAt: null,
  });
  expect(r.id).toBeGreaterThanOrEqual(1001);
});

test('[RFD-02] 배송 중인 주문은 환불을 요청할 수 없다', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 100_000);
  const d = await deliveryOfOrder(admin, order.id);
  await body(await setDeliveryStatus(admin, d.id, 'SHIPPED'));
  expect(await errorOf(await requestRefund(admin, order.id, 10_000))).toEqual(err('REFUND_STATE_INVALID'));
});

test('[RFD-03] 결제 대기 · 만료 주문은 환불을 요청할 수 없다', async ({ anon, admin }) => {
  const pending = await createOrder(anon, GENERAL, 100_000);
  expect(await errorOf(await requestRefund(admin, pending.id, 10_000))).toEqual(err('REFUND_ORDER_NOT_PAID'));
  expect(await errorOf(await requestRefund(admin, expiredOrder, 10_000))).toEqual(err('REFUND_ORDER_NOT_PAID'));
  expect(await errorOf(await requestRefund(admin, 999_999, 10_000))).toEqual(err('ORDER_NOT_FOUND'));
});

test('[RFD-04] 환불 가능 금액을 넘는 요청', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 100_000);
  await requestAndApprove(admin, order.id, 70_000);
  expect(await errorOf(await requestRefund(admin, order.id, 40_000))).toEqual(err('REFUND_AMOUNT_EXCEEDED'));
  expect((await body<Refund>(await requestRefund(admin, order.id, 30_000), 201)).amount).toBe(30000);
});

test('[RFD-05] 처리 중인 환불이 있으면 다시 요청할 수 없다', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 100_000);
  await body(await requestRefund(admin, order.id, 10_000), 201);
  expect(await errorOf(await requestRefund(admin, order.id, 10_000))).toEqual(err('REFUND_ALREADY_REQUESTED'));
});

test('[RFD-06] 무료배송 주문의 부분 환불로 기준 미만이 되면 배송비 차감', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 160_000);
  expect(order.deliveryFee).toBe(0);
  const r = await requestAndApprove(admin, order.id, 20_000);
  expect(r).toMatchObject({ status: 'APPROVED', partial: true, deliveryFeeDeduction: 3000, refundedAmount: 17000, processedAt: T0 });
});

test('[RFD-07] 남은 금액이 기준 이상이면 차감 없음', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 200_000);
  const r = await requestAndApprove(admin, order.id, 20_000);
  expect(r).toMatchObject({ deliveryFeeDeduction: 0, refundedAmount: 20000 });
});

test('[RFD-08] 배송비 3,000원 주문은 차감 없음', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 100_000);
  expect(order.deliveryFee).toBe(3000);
  const r = await requestAndApprove(admin, order.id, 30_000);
  expect(r).toMatchObject({ deliveryFeeDeduction: 0, refundedAmount: 30000 });
});

test('[RFD-09] 한 주문에서 배송비 차감은 한 번', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 308_000);
  const first = await requestAndApprove(admin, order.id, 289_000);
  expect(first).toMatchObject({ deliveryFeeDeduction: 3000, refundedAmount: 286000 });
  const second = await requestAndApprove(admin, order.id, 19_000);
  expect(second).toMatchObject({ partial: true, deliveryFeeDeduction: 0, refundedAmount: 19000 });
});

test('[RFD-10] 차감액은 환불 금액을 넘지 않는다', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 152_000);
  const r = await requestAndApprove(admin, order.id, 2_500);
  expect(r).toMatchObject({ deliveryFeeDeduction: 2500, refundedAmount: 0 });
});

test('[RFD-11] 환불 거절', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 160_000);
  const r = await body<Refund>(await requestRefund(admin, order.id, 20_000), 201);
  const rejected = await body<Refund>(await admin.post(`/api/admin/refunds/${r.id}/reject`));
  expect(rejected).toMatchObject({ status: 'REJECTED', processedAt: T0, deliveryFeeDeduction: null, refundedAmount: null });
});

test('[RFD-12] 처리된 환불은 다시 처리할 수 없다', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 100_000);
  const approved = await requestAndApprove(admin, order.id, 10_000);
  expect(await errorOf(await admin.post(`/api/admin/refunds/${approved.id}/approve`))).toEqual(err('REFUND_ALREADY_PROCESSED'));
  expect(await errorOf(await admin.post(`/api/admin/refunds/${approved.id}/reject`))).toEqual(err('REFUND_ALREADY_PROCESSED'));
  const r = await body<Refund>(await requestRefund(admin, order.id, 10_000), 201);
  await body(await admin.post(`/api/admin/refunds/${r.id}/reject`));
  expect(await errorOf(await admin.post(`/api/admin/refunds/${r.id}/approve`))).toEqual(err('REFUND_ALREADY_PROCESSED'));
  expect(await errorOf(await admin.post('/api/admin/refunds/999999/approve'))).toEqual(err('REFUND_NOT_FOUND'));
});

test('[RFD-13] 전체 환불은 부분 환불이 아니고 차감 없음', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 160_000);
  const r = await requestAndApprove(admin, order.id, 160_000);
  expect(r).toMatchObject({ partial: false, deliveryFeeDeduction: 0, refundedAmount: 160000 });
});

test('[RFD-14] 환불 목록은 ID 내림차순', async ({ admin }) => {
  const list = await body<Refund[]>(await admin.get('/api/admin/refunds'));
  expect(list.length).toBeGreaterThanOrEqual(20);
  const ids = list.map((r) => r.id);
  expect(ids).toEqual([...ids].sort((a, b) => b - a));
  expectKeys(list[0], REFUND_KEYS);
});

test('[RFD-16] 빈 환불 사유는 400', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 100_000);
  const res = await admin.post('/api/admin/refunds', { data: { orderId: order.id, amount: 1000, reason: '' } });
  expect(await errorOf(res)).toEqual(err('VALIDATION_FAILED'));
});
