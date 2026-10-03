import { expect, type Locator, type Page } from '@playwright/test';
import { PASSWORD } from './api';

// ui.md §4 의 표시 형식
export const won = (n: number) => `${n.toLocaleString('en-US')}원`;

export function dateTime(iso: string | null): string {
  if (iso === null) return '-';
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}\+09:00$/.exec(iso);
  if (!m) throw new Error(`unexpected time ${iso}`);
  return `${m[1]} ${m[2]}`;
}

export const LABELS: Record<string, Record<string, string>> = {
  grade: { GENERAL: '일반', VIP: 'VIP' },
  memberStatus: { ACTIVE: '활성', SUSPENDED: '정지', WITHDRAWN: '탈퇴' },
  orderStatus: { PENDING_PAYMENT: '결제 대기', PAID: '결제 완료', EXPIRED: '만료' },
  deliveryStatus: { READY: '출고 대기', SHIPPED: '배송 중', DELIVERED: '배송 완료' },
  refundStatus: { REQUESTED: '요청', APPROVED: '승인', REJECTED: '거절' },
  partial: { true: '부분', false: '전체' },
  role: { ADMIN: '관리자', OPERATOR: '운영자' },
  active: { true: '활성', false: '비활성' },
};

export const orNull = (n: number | null) => (n === null ? '-' : won(n));

export async function loginUi(page: Page, loginId: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('로그인 ID').fill(loginId);
  await page.getByLabel('비밀번호').fill(PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await expectPath(page, '/members');
}

// query 를 빼고 경로만 비교한다
export async function expectPath(page: Page, path: string): Promise<void> {
  await expect.poll(() => new URL(page.url()).pathname).toBe(path);
}

export function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: '주메뉴' });
}

// 메뉴의 그룹 이름과 그 안의 항목 이름을 화면 순서대로 읽는다(ui.md §3 의 nav > h2 + ul 구조)
export async function readMenu(page: Page): Promise<{ group: string; items: string[] }[]> {
  await expect(mainNav(page).getByRole('link').first()).toBeVisible();
  return mainNav(page).evaluate((nav) =>
    Array.from(nav.querySelectorAll('h2')).map((h) => {
      let ul = h.nextElementSibling;
      while (ul && ul.tagName !== 'UL') ul = ul.nextElementSibling;
      return {
        group: (h.textContent ?? '').trim(),
        items: ul ? Array.from(ul.querySelectorAll('a')).map((a) => (a.textContent ?? '').trim()) : [],
      };
    }),
  );
}

export function mainTable(page: Page): Locator {
  return page.locator('main table, table').first();
}

// 데이터 행이 n 개 그려질 때까지 기다린다. 표를 읽기 전에 부른다
export async function waitRows(table: Locator, n: number): Promise<void> {
  await expect(table.locator('tbody tr')).toHaveCount(n);
}

export async function headers(table: Locator): Promise<string[]> {
  await expect(table.locator('thead th').first()).toBeVisible();
  return (await table.locator('thead th').allTextContents()).map((t) => t.trim());
}

export async function bodyRows(table: Locator): Promise<string[][]> {
  return table.locator('tbody tr').evaluateAll((rows) =>
    rows.map((r) => Array.from(r.querySelectorAll('td, th')).map((td) => (td.textContent ?? '').trim())),
  );
}

export async function definitionList(page: Page): Promise<Record<string, string>> {
  await expect(page.locator('dl dd').first()).not.toBeEmpty();
  return page.locator('dl').first().evaluate((dl) => {
    const out: Record<string, string> = {};
    for (const dt of Array.from(dl.querySelectorAll('dt'))) {
      let dd = dt.nextElementSibling;
      while (dd && dd.tagName !== 'DD') dd = dd.nextElementSibling;
      out[(dt.textContent ?? '').trim()] = (dd?.textContent ?? '').trim();
    }
    return out;
  });
}
