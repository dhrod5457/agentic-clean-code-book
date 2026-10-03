import { expect, type Page } from '@playwright/test';

export const TEST_PASSWORD = 'test1234!';

/** 로그인 화면에서 로그인하고 회원 목록 화면이 열릴 때까지 기다린다. */
export async function login(page: Page, loginId: string, password: string = TEST_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('로그인 ID').fill(loginId);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole('heading', { level: 1, name: '회원 목록' })).toBeVisible();
}
