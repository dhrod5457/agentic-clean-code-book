import { expect, type Locator, type Page } from '@playwright/test';
import { body, test } from '../../support/api';
import { headers, loginUi, mainTable } from '../../support/ui';

// 실험 3: 관리자 계정 목록에서 긴 부서명이 액션 버튼을 밀어내는 문제
// 기준 screenshot(__screenshots__)은 체크리스트 7단계에서 기준 commit 으로 만든다.

function department(length: number): string {
  const words = '글로벌 이커머스 플랫폼 운영 본부 고객 경험 혁신 담당 ';
  let s = '';
  while (s.length < length) s += words;
  s = s.slice(0, length);
  return s.endsWith(' ') ? `${s.slice(0, -1)}부` : s;
}

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
];

// 표를 감싸는 가로 스크롤 컨테이너. 없으면 표의 부모 요소
async function containerBox(table: Locator) {
  return table.evaluate((el) => {
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') break;
      node = node.parentElement;
    }
    const target = node && node !== document.body ? node : el.parentElement!;
    const r = target.getBoundingClientRect();
    return { x: r.x, width: r.width, scrollLeft: target.scrollLeft };
  });
}

async function expectButtonsInside(page: Page, viewportWidth: number) {
  const table = mainTable(page);
  const container = await containerBox(table);
  expect(container.scrollLeft).toBe(0);
  const buttons = table.getByRole('button', { name: /^(수정|비활성화)$/ });
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    await expect(b).toBeVisible();
    const box = (await b.boundingBox())!;
    const label = `${await b.textContent()} #${i} (viewport ${viewportWidth})`;
    expect(box.x, label).toBeGreaterThanOrEqual(Math.max(0, container.x) - 0.5);
    expect(box.x + box.width, label).toBeLessThanOrEqual(Math.min(viewportWidth, container.x + container.width) + 0.5);
  }
}

const LONG = [['grading.long80', 80], ['grading.long120', 120]] as const;

// 긴 부서명 계정은 묶음 안에서 한 번만 만든다. 화면 폭마다 결과를 따로 남기려고 시험을 나눈다
test.describe.serial('긴 부서명', () => {
  test('부서명 80자 · 120자 계정 생성', async ({ admin }) => {
    for (const [loginId, length] of LONG) {
      const created = await body<{ department: string }>(await admin.post('/api/admin/staff', {
        data: { loginId, name: `긴 부서 ${length}`, department: department(length), role: 'OPERATOR', password: 'Passw0rd!' },
      }), 201);
      expect(created.department).toHaveLength(length);
    }
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}×${viewport.height} 에서 액션 버튼이 스크롤 없이 보인다`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginUi(page, 'admin');
      await page.goto('/staff');
      await expect(page.getByRole('heading', { level: 1, name: '관리자 계정' })).toBeVisible();
      const table = mainTable(page);
      await expect(table.locator('tbody tr').filter({ hasText: 'grading.long120' })).toHaveCount(1);
      // 열을 숨기거나 순서를 바꾸는 수정은 ui.md §2 · §5.9 위반이다
      expect(await headers(table)).toEqual(['로그인 ID', '이름', '부서', '역할', '상태', '처리']);
      for (const [loginId] of LONG) {
        await expect(table.locator('tbody tr').filter({ hasText: loginId }).locator('td').nth(2)).toBeVisible();
      }
      await expectButtonsInside(page, viewport.width);
    });
  }
});

test('다른 목록 화면 4개는 기준 화면과 같다', async ({ page }) => {
  await loginUi(page, 'admin');
  for (const [path, title, file] of [
    ['/members', '회원 목록', 'members.png'],
    ['/orders', '주문 목록', 'orders.png'],
    ['/deliveries', '배송 목록', 'deliveries.png'],
    ['/refunds', '환불 목록', 'refunds.png'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page).toHaveScreenshot(file, { fullPage: true });
  }
});
