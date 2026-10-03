import { body, createOrder, deliveryOfOrder, expect, payOrder, requestAndApprove, test } from '../support/api';
import { activeVips } from '../support/seed';

const VIP = activeVips[0].id;

test('[FLW-01] 주문 생성 · 결제 · 배송 생성', async ({ anon, admin }) => {
  const order = await createOrder(anon, VIP, 308_000);
  const paid = await payOrder(anon, order.id);
  expect(paid.status).toBe('PAID');
  expect(await deliveryOfOrder(admin, order.id)).toMatchObject({ status: 'READY', fee: 0 });
  expect((await body<{ status: string }>(await admin.get(`/api/admin/orders/${order.id}`))).status).toBe('PAID');
});

test('[FLW-02] 주문 · 결제 · 부분 환불 승인과 배송비 차감', async ({ anon, admin }) => {
  const order = await createOrder(anon, VIP, 160_000);
  await payOrder(anon, order.id);
  const r = await requestAndApprove(admin, order.id, 20_000);
  expect(r).toMatchObject({ deliveryFeeDeduction: 3000, refundedAmount: 17000 });
});
