import { expect } from '@playwright/test';
import { test } from '../../support/api';
import { loginUi } from '../../support/ui';
import { createLongDepartmentStaff, measureStaffList, openStaffList } from './long-department';

// 실험 3: 관리자 계정 목록에서 긴 부서명이 액션 버튼을 밀어내는 문제
// 판정 화면 폭은 1280×800 하나다. 1024×768 은 판정에 넣지 않고 diagnostics/exp3-1024.spec.ts 에서 따로 기록한다(설계 §8.3).
// 기준 screenshot(__screenshots__)은 체크리스트 7단계에서 기준 commit 으로 만든다.

const VIEWPORT = { width: 1280, height: 800 };

// 긴 부서명 계정은 묶음 안에서 한 번만 만든다
test.describe.serial('긴 부서명', () => {
  test('부서명 80자 · 120자 계정 생성', async ({ admin }) => {
    expect(await createLongDepartmentStaff(admin, 'grading')).toEqual([80, 120]);
  });

  test(`${VIEWPORT.width}×${VIEWPORT.height} 에서 액션 버튼이 스크롤 없이 보인다`, async ({ page }) => {
    await openStaffList(page, VIEWPORT, 'grading');
    const m = await measureStaffList(page, VIEWPORT.width, 'grading');
    // 열을 숨기거나 순서를 바꾸는 수정은 ui.md §2 · §5.9 위반이다
    expect(m.headers).toEqual(['로그인 ID', '이름', '부서', '역할', '상태', '처리']);
    expect(m.departmentCellVisible).toEqual({ 'grading.long80': true, 'grading.long120': true });
    expect(m.scrollLeft).toBe(0);
    expect(m.buttons.length).toBeGreaterThan(0);
    for (const b of m.buttons) {
      expect(b.visible, b.label).toBe(true);
      expect(b.left, b.label).toBeGreaterThanOrEqual(m.bounds.left - 0.5);
      expect(b.right, b.label).toBeLessThanOrEqual(m.bounds.right + 0.5);
    }
  });
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
