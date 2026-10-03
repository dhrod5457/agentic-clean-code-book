import { expect, test } from '@playwright/test';
import { login } from './helpers/session';

test('[E2E-02] operator 는 회원 상세에 쓰기 버튼이 없고 배송 목록에 출고 처리 버튼이 있다', async ({
  page,
}) => {
  await login(page, 'operator');
  await expect(page.getByText('이서연 (운영자)')).toBeVisible();

  await page
    .getByRole('table', { name: '회원 목록' })
    .getByRole('link', { name: '윤지우' })
    .click();
  await expect(page).toHaveURL(/\/members\/1$/);
  await expect(page.getByRole('heading', { level: 1, name: '회원 상세' })).toBeVisible();
  await expect(page.getByText('member01@example.com')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);

  await page
    .getByRole('navigation', { name: '주메뉴' })
    .getByRole('link', { name: '배송 목록' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: '배송 목록' })).toBeVisible();
  await expect(page.getByRole('button', { name: '출고 처리' }).first()).toBeVisible();
});
