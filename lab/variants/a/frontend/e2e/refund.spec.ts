import { expect, test } from '@playwright/test';
import { createOrder, payOrder, requestRefund } from './helpers/api';
import { login } from './helpers/session';

const VIP_MEMBER_ID = 4;

test('[E2E-05] VIP 160,000원 주문의 20,000원 환불을 승인하면 배송비 3,000원을 차감하고 17,000원을 환불한다', async ({
  page,
  request,
}) => {
  const order = await createOrder(request, VIP_MEMBER_ID, [
    { productName: 'E2E 환불 시험 상품', unitPrice: 160000, quantity: 1 },
  ]);
  expect(order.deliveryFee).toBe(0);
  await payOrder(request, order.id);
  const refund = await requestRefund(request, {
    orderId: order.id,
    amount: 20000,
    reason: '단순 변심',
  });

  await login(page, 'admin');
  await page
    .getByRole('navigation', { name: '주메뉴' })
    .getByRole('link', { name: '환불 목록' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: '환불 목록' })).toBeVisible();

  const row = page
    .getByRole('table', { name: '환불 목록' })
    .locator('tbody tr')
    .filter({ has: page.locator('td:nth-child(1)', { hasText: new RegExp(`^${refund.id}$`) }) });
  await expect(row).toHaveCount(1);
  await expect(row.locator('td').nth(6)).toHaveText('요청');

  await row.getByRole('button', { name: '승인' }).click();

  await expect(row.locator('td').nth(6)).toHaveText('승인');
  await expect(row.locator('td').nth(1)).toHaveText(String(order.id));
  await expect(row.locator('td').nth(2)).toHaveText('부분');
  await expect(row.locator('td').nth(3)).toHaveText('20,000원');
  await expect(row.locator('td').nth(4)).toHaveText('3,000원');
  await expect(row.locator('td').nth(5)).toHaveText('17,000원');
  await expect(row.getByRole('button')).toHaveCount(0);
});
