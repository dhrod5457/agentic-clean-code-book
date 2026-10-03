import {
  DELIVERY_KEYS, body, createPaidOrder, deliveryOfOrder, expect, errorOf, err, expectKeys, lines, setDeliveryStatus, test,
  type Delivery,
} from '../support/api';
import { T0, activeGenerals, activeVips } from '../support/seed';

const VIP = activeVips[0].id;
const GENERAL = activeGenerals[0].id;

async function previewFee(anon: import('@playwright/test').APIRequestContext, memberId: number, amount: number) {
  const res = await anon.post('/api/orders/preview', { data: { memberId, lines: lines(amount) } });
  return (await body<{ deliveryFee: number }>(res)).deliveryFee;
}

test('[DLV-01] VIP 회원 150,000원 주문은 배송비 0원', async ({ anon }) => {
  expect(await previewFee(anon, VIP, 150_000)).toBe(0);
});

test('[DLV-02] VIP 회원 149,999원 주문은 배송비 3,000원', async ({ anon }) => {
  expect(await previewFee(anon, VIP, 149_999)).toBe(3000);
});

test('[DLV-03] GENERAL 회원 150,000원 주문은 배송비 3,000원', async ({ anon }) => {
  expect(await previewFee(anon, GENERAL, 150_000)).toBe(3000);
});

test('[DLV-04] 배송 정책 조회', async ({ admin }) => {
  expect(await body(await admin.get('/api/admin/delivery-policy'))).toEqual({ baseFee: 3000, vipFreeShippingThreshold: 150000 });
});

test('[DLV-05] READY 배송을 SHIPPED 로 변경', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 50_000);
  const d = await deliveryOfOrder(admin, order.id);
  expect(d.status).toBe('READY');
  const shipped = await body<Delivery>(await setDeliveryStatus(admin, d.id, 'SHIPPED'));
  expect(shipped).toMatchObject({ id: d.id, status: 'SHIPPED', shippedAt: T0, deliveredAt: null });
});

test('[DLV-06] SHIPPED 배송을 DELIVERED 로 변경', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 50_000);
  const d = await deliveryOfOrder(admin, order.id);
  await body(await setDeliveryStatus(admin, d.id, 'SHIPPED'));
  const delivered = await body<Delivery>(await setDeliveryStatus(admin, d.id, 'DELIVERED'));
  expect(delivered).toMatchObject({ status: 'DELIVERED', shippedAt: T0, deliveredAt: T0 });
});

test('[DLV-07] 허용하지 않는 배송 상태 변경', async ({ anon, admin }) => {
  const order = await createPaidOrder(anon, GENERAL, 50_000);
  const d = await deliveryOfOrder(admin, order.id);
  expect(await errorOf(await setDeliveryStatus(admin, d.id, 'DELIVERED'))).toEqual(err('DELIVERY_STATE_INVALID'));
  await body(await setDeliveryStatus(admin, d.id, 'SHIPPED'));
  expect(await errorOf(await setDeliveryStatus(admin, d.id, 'READY'))).toEqual(err('DELIVERY_STATE_INVALID'));
  await body(await setDeliveryStatus(admin, d.id, 'DELIVERED'));
  expect(await errorOf(await setDeliveryStatus(admin, d.id, 'SHIPPED'))).toEqual(err('DELIVERY_STATE_INVALID'));
});

test('[DLV-08] 정의하지 않은 배송 상태 값', async ({ admin }) => {
  const any = (await body<Delivery[]>(await admin.get('/api/admin/deliveries')))[0];
  expect(await errorOf(await setDeliveryStatus(admin, any.id, 'LOST'))).toEqual(err('VALIDATION_FAILED'));
});

test('[DLV-09] 배송 목록은 ID 내림차순', async ({ admin }) => {
  const list = await body<Delivery[]>(await admin.get('/api/admin/deliveries'));
  expect(list.length).toBeGreaterThanOrEqual(100);
  const ids = list.map((d) => d.id);
  expect(ids).toEqual([...ids].sort((a, b) => b - a));
  expectKeys(list[0], DELIVERY_KEYS);
});
