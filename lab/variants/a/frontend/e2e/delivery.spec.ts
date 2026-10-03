import { expect, test } from '@playwright/test';
import { createOrder, payOrder } from './helpers/api';
import { login } from './helpers/session';

test('[E2E-04] API 로 만든 결제 완료 주문의 배송을 출고 처리하면 상태가 배송 중이 된다', async ({
  page,
  request,
}) => {
  const order = await createOrder(request, 1, [
    { productName: 'E2E 출고 시험 상품', unitPrice: 25000, quantity: 2 },
  ]);
  await payOrder(request, order.id);

  await login(page, 'admin');
  await page
    .getByRole('navigation', { name: '주메뉴' })
    .getByRole('link', { name: '배송 목록' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: '배송 목록' })).toBeVisible();

  const row = page
    .getByRole('table', { name: '배송 목록' })
    .locator('tbody tr')
    .filter({ has: page.locator('td:nth-child(2)', { hasText: new RegExp(`^${order.id}$`) }) });
  await expect(row).toHaveCount(1);
  await expect(row.locator('td').nth(2)).toHaveText('출고 대기');
  await expect(row.locator('td').nth(3)).toHaveText('3,000원');

  await row.getByRole('button', { name: '출고 처리' }).click();

  await expect(row.locator('td').nth(2)).toHaveText('배송 중');
  await expect(row.locator('td').nth(5)).toHaveText('2026-01-15 10:00');
  await expect(row.getByRole('button', { name: '도착 처리' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
