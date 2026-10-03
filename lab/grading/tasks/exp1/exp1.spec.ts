import { body, createPaidOrder, expect, lines, requestAndApprove, test, type OrderSummary } from '../../support/api';
import { activeGenerals, activeVips, memberById, seed } from '../../support/seed';
import { definitionList, loginUi } from '../../support/ui';

// 실험 1: VIP 무료배송 기준 150,000원 → 100,000원
const VIP = activeVips[0].id;
const GENERAL = activeGenerals[0].id;

async function fee(anon: import('@playwright/test').APIRequestContext, memberId: number, amount: number) {
  return (await body<{ deliveryFee: number }>(await anon.post('/api/orders/preview', { data: { memberId, lines: lines(amount) } }))).deliveryFee;
}

test('VIP 100,000원은 무료배송, 99,999원은 3,000원, GENERAL 100,000원은 3,000원', async ({ anon }) => {
  expect(await fee(anon, VIP, 100_000)).toBe(0);
  expect(await fee(anon, VIP, 99_999)).toBe(3000);
  expect(await fee(anon, GENERAL, 100_000)).toBe(3000);
});

test('배송 정책의 기준 금액은 100,000원', async ({ admin }) => {
  expect(await body(await admin.get('/api/admin/delivery-policy'))).toEqual({ baseFee: 3000, vipFreeShippingThreshold: 100000 });
});

test('배송 정책 화면에 100,000원을 표시한다', async ({ page }) => {
  await loginUi(page, 'admin');
  await page.goto('/delivery-policy');
  expect(await definitionList(page)).toEqual({ '기본 배송비': '3,000원', 'VIP 무료배송 기준 금액': '100,000원' });
});

test('VIP 120,000원 주문에서 30,000원 부분 환불 → 남은 90,000원으로 배송비 3,000원 차감', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 120_000);
  expect(order.deliveryFee).toBe(0);
  expect(await requestAndApprove(admin, order.id, 30_000)).toMatchObject({ deliveryFeeDeduction: 3000, refundedAmount: 27000 });
});

test('VIP 120,000원 주문에서 10,000원 부분 환불 → 남은 110,000원으로 차감 없음', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, VIP, 120_000);
  expect(await requestAndApprove(admin, order.id, 10_000)).toMatchObject({ deliveryFeeDeduction: 0, refundedAmount: 10000 });
});

test('seed 주문의 저장된 배송비는 바뀌지 않는다', async ({ admin }) => {
  const list = await body<OrderSummary[]>(await admin.get('/api/admin/orders'));
  const byId = new Map(list.map((o) => [o.id, o]));
  // 새 기준이면 무료배송이 됐을 주문(VIP, 100,000원 이상 150,000원 미만)이 포함돼 있어야 의미가 있다
  const affected = seed.orders.filter((o) => memberById(o.member_id).grade === 'VIP' && o.product_amount >= 100_000 && o.product_amount < 150_000);
  expect(affected.length).toBeGreaterThan(0);
  for (const o of seed.orders) {
    expect(byId.get(o.id), `주문 ${o.id}`).toMatchObject({ deliveryFee: o.delivery_fee, totalAmount: o.total_amount });
  }
});
