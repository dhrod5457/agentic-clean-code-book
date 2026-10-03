import { expect, test } from '@playwright/test';
import { login } from './helpers/session';

test('[E2E-01] admin 으로 로그인하면 회원 목록 화면과 메뉴 그룹 5개를 표시한다', async ({
  page,
}) => {
  await login(page, 'admin');

  await expect(page.getByRole('heading', { level: 1, name: '회원 목록' })).toBeVisible();
  await expect(page.getByRole('table', { name: '회원 목록' })).toBeVisible();
  await expect(page.getByText('김지훈 (관리자)')).toBeVisible();
  const nav = page.getByRole('navigation', { name: '주메뉴' });
  await expect(nav.getByRole('heading', { level: 2 })).toHaveText([
    '회원',
    '주문',
    '배송',
    '환불',
    '설정',
  ]);
  await expect(nav.getByRole('link', { name: '회원 목록' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
