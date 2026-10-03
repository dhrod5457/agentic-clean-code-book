import { expect, type Locator } from '@playwright/test';
import { body, createPaidOrder, requestRefund, test, type Refund } from '../support/api';
import { activeGenerals, activeVips } from '../support/seed';
import { loginUi, mainTable } from '../support/ui';

// 화면에서 쓰기 동작을 하는 흐름. 데이터를 바꾸므로 읽기 전용 화면 묶음(screens)과 따로 실행한다.

function rowWhere(table: Locator, column: number, text: string): Locator {
  return table.locator('tbody tr').filter({
    has: table.page().locator(`td:nth-child(${column})`, { hasText: new RegExp(`^\\s*${text}\\s*$`) }),
  });
}

test('[E2E-03] 관리자 계정 추가', async ({ page }) => {
  await loginUi(page, 'admin');
  await page.goto('/staff');
  await page.getByRole('button', { name: '관리자 계정 추가' }).click();
  await page.getByLabel('로그인 ID').fill('grading.e2e03');
  await page.getByLabel('이름').fill('화면 계정');
  await page.getByLabel('부서').fill('물류팀');
  await page.getByLabel('역할').selectOption({ label: '운영자' });
  await page.getByLabel('비밀번호').fill('Passw0rd!');
  await page.getByRole('button', { name: '등록' }).click();
  const row = rowWhere(mainTable(page), 1, 'grading.e2e03');
  await expect(row).toHaveCount(1);
  await expect(row.locator('td').nth(3)).toHaveText('운영자');
});

test('[E2E-04] 배송 목록에서 출고 처리', async ({ anon, page }) => {
  const order = await createPaidOrder(anon, activeGenerals[0].id, 45_000);
  await loginUi(page, 'admin');
  await page.goto('/deliveries');
  const row = rowWhere(mainTable(page), 2, String(order.id));
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: '출고 처리' }).click();
  await expect(row.locator('td').nth(2)).toHaveText('배송 중');
});

test('[E2E-05] 환불 목록에서 승인하면 배송비 차감과 환불 금액을 표시한다', async ({ anon, admin, page }) => {
  const order = await createPaidOrder(anon, activeVips[0].id, 160_000);
  const refund = await body<Refund>(await requestRefund(admin, order.id, 20_000), 201);
  await loginUi(page, 'admin');
  await page.goto('/refunds');
  const row = rowWhere(mainTable(page), 1, String(refund.id));
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: '승인' }).click();
  await expect(row.locator('td').nth(4)).toHaveText('3,000원');
  await expect(row.locator('td').nth(5)).toHaveText('17,000원');
  await expect(row.locator('td').nth(6)).toHaveText('승인');
});
