import {
  ORDER_SUMMARY_KEYS, body, createOrder, deliveryOfOrder, expect, errorOf, err, expectKeys, payOrder, test,
  type OrderDetail, type OrderSummary,
} from '../support/api';
import { MINUTE, T0, T0_MS, activeGenerals, activeVips, ms, seed } from '../support/seed';

const VIP = activeVips[0].id;
const GENERAL = activeGenerals[0].id;
const suspended = seed.members.find((m) => m.status === 'SUSPENDED')!.id;
const withdrawn = seed.members.find((m) => m.status === 'WITHDRAWN')!.id;
const pending = seed.orders.filter((o) => o.status === 'PENDING_PAYMENT');
const overdue = pending.filter((o) => ms(o.created_at) + 30 * MINUTE <= T0_MS);
const notOverdue = pending.filter((o) => ms(o.created_at) + 30 * MINUTE > T0_MS);

const twoLines = [
  { productName: '27인치 모니터', unitPrice: 289000, quantity: 1 },
  { productName: '데스크 매트', unitPrice: 19000, quantity: 2 },
];

test('[ORD-01] 상품 금액은 단가 × 수량의 합계', async ({ anon }) => {
  const res = await anon.post('/api/orders/preview', { data: { memberId: GENERAL, lines: twoLines } });
  expect(await body(res)).toEqual({ memberId: GENERAL, productAmount: 327000, deliveryFee: 3000, totalAmount: 330000 });
});

test('[ORD-02] 주문 생성 시 배송비와 결제 금액을 저장', async ({ anon }) => {
  const order = await createOrder(anon, VIP, 308_000);
  expect(order).toMatchObject({
    memberId: VIP, status: 'PENDING_PAYMENT', productAmount: 308000, deliveryFee: 0, totalAmount: 308000,
    createdAt: T0, paidAt: null, expiredAt: null,
  });
  expect(order.id).toBeGreaterThanOrEqual(1001);
});

test('[ORD-03] 금액 미리보기는 주문을 저장하지 않는다', async ({ anon, admin }) => {
  const before = (await body<OrderSummary[]>(await admin.get('/api/admin/orders'))).length;
  const res = await anon.post('/api/orders/preview', { data: { memberId: VIP, lines: twoLines } });
  expect(await body(res)).toEqual({ memberId: VIP, productAmount: 327000, deliveryFee: 0, totalAmount: 327000 });
  const after = (await body<OrderSummary[]>(await admin.get('/api/admin/orders'))).length;
  expect(after).toBe(before);
});

test('[ORD-04] 음수 단가는 400', async ({ anon }) => {
  const res = await anon.post('/api/orders', { data: { memberId: GENERAL, lines: [{ productName: '상품', unitPrice: -1, quantity: 1 }] } });
  expect(await errorOf(res)).toEqual(err('VALIDATION_FAILED'));
});

test('[ORD-05] memberId 가 없으면 400', async ({ anon }) => {
  const res = await anon.post('/api/orders', { data: { lines: twoLines } });
  expect(await errorOf(res)).toEqual(err('VALIDATION_FAILED'));
});

test('[ORD-06] 정지 · 탈퇴 회원은 주문할 수 없다', async ({ anon }) => {
  for (const memberId of [suspended, withdrawn]) {
    expect(await errorOf(await anon.post('/api/orders', { data: { memberId, lines: twoLines } }))).toEqual(err('MEMBER_NOT_ORDERABLE'));
  }
});

test('[ORD-07] 결제 완료 시 PAID 와 READY 배송', async ({ anon, admin }) => {
  const order = await createOrder(anon, VIP, 160_000);
  const paid = await payOrder(anon, order.id);
  expect(paid).toMatchObject({ id: order.id, status: 'PAID', paidAt: T0, deliveryFee: 0 });
  const d = await deliveryOfOrder(admin, order.id);
  expect(d).toMatchObject({ status: 'READY', fee: 0, createdAt: T0, shippedAt: null, deliveredAt: null });
});

test('[ORD-08] PAID 주문은 다시 결제할 수 없다', async ({ anon }) => {
  const order = await createOrder(anon, GENERAL, 10_000);
  await payOrder(anon, order.id);
  expect(await errorOf(await anon.post(`/api/orders/${order.id}/pay`))).toEqual(err('ORDER_STATE_INVALID'));
});

test('[ORD-11] 주문 상세의 상품 금액', async ({ anon, admin }) => {
  const created = await body<OrderDetail>(await anon.post('/api/orders', { data: { memberId: GENERAL, lines: twoLines } }), 201);
  const detail = await body<OrderDetail>(await admin.get(`/api/admin/orders/${created.id}`));
  expect(detail.lines).toEqual([
    { productName: '27인치 모니터', unitPrice: 289000, quantity: 1, lineAmount: 289000 },
    { productName: '데스크 매트', unitPrice: 19000, quantity: 2, lineAmount: 38000 },
  ]);
  expect(await errorOf(await admin.get('/api/admin/orders/999999'))).toEqual(err('ORDER_NOT_FOUND'));
});

test('[ORD-15] 주문 목록은 ID 내림차순', async ({ admin }) => {
  const list = await body<OrderSummary[]>(await admin.get('/api/admin/orders'));
  expect(list.length).toBeGreaterThanOrEqual(120);
  const ids = list.map((o) => o.id);
  expect(ids).toEqual([...ids].sort((a, b) => b - a));
  expectKeys(list[0], ORDER_SUMMARY_KEYS);
});

// ORD-09 다음에 ORD-10 이 seed 의 기한 지난 주문을 만료시키므로 순서대로 실행한다
test.describe.serial('결제 기한', () => {
  test('[ORD-09] 결제 기한이 지난 결제 대기 주문은 결제할 수 없다', async ({ anon, admin }) => {
    expect(overdue.length).toBeGreaterThan(0);
    for (const o of overdue) {
      expect(await errorOf(await anon.post(`/api/orders/${o.id}/pay`))).toEqual(err('ORDER_PAYMENT_EXPIRED'));
      const after = await body<OrderSummary>(await admin.get(`/api/admin/orders/${o.id}`));
      expect(after.status).toBe('PENDING_PAYMENT');
    }
  });

  test('[ORD-10] 만료 처리는 기한이 지난 결제 대기 주문만 바꾼다', async ({ admin }) => {
    const res = await admin.post('/api/admin/orders/expire-overdue');
    expect(await body(res)).toEqual({ expiredCount: overdue.length });
    for (const o of overdue) {
      expect(await body(await admin.get(`/api/admin/orders/${o.id}`))).toMatchObject({ status: 'EXPIRED', expiredAt: T0 });
    }
    for (const o of notOverdue) {
      expect(await body(await admin.get(`/api/admin/orders/${o.id}`))).toMatchObject({ status: 'PENDING_PAYMENT', expiredAt: null });
    }
  });
});
