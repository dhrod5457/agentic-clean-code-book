import { expect, test } from '@playwright/test';
import { uniqueLoginId } from './helpers/api';
import { login } from './helpers/session';

test('[E2E-03] admin 이 관리자 계정 추가로 계정을 만들면 목록에 새 계정을 표시한다', async ({
  page,
}) => {
  const loginId = uniqueLoginId('e2e');
  await login(page, 'admin');
  await page
    .getByRole('navigation', { name: '주메뉴' })
    .getByRole('link', { name: '관리자 계정' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: '관리자 계정 목록' })).toBeVisible();

  await page.getByRole('button', { name: '관리자 계정 추가' }).click();
  await page.getByLabel('로그인 ID', { exact: true }).fill(loginId);
  await page.getByLabel('이름', { exact: true }).fill('시험계정');
  await page.getByLabel('부서', { exact: true }).fill('품질팀');
  await page.getByLabel('역할', { exact: true }).selectOption({ label: '운영자' });
  await page.getByLabel('비밀번호', { exact: true }).fill('e2e-pass-1234');
  await page.getByRole('button', { name: '등록' }).click();

  await expect(page.getByLabel('로그인 ID', { exact: true })).toHaveCount(0);
  const row = page
    .getByRole('table', { name: '관리자 계정 목록' })
    .locator('tbody tr')
    .filter({
      has: page.locator('td:nth-child(1)', {
        hasText: new RegExp(`^${loginId.replaceAll('.', '\\.')}$`),
      }),
    });
  await expect(row).toHaveCount(1);
  await expect(row.locator('td')).toHaveText([
    loginId,
    '시험계정',
    '품질팀',
    '운영자',
    '활성',
    /수정\s*비활성화/,
  ]);
  await expect(row.getByRole('button', { name: '수정' })).toBeVisible();
});
