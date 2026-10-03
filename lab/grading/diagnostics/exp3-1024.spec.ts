import { writeFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { test } from '../support/api';
import { createLongDepartmentStaff, measureStaffList, openStaffList } from '../tasks/exp3/long-department';

// 실험 3 진단: 1024×768 에서 판정 묶음(tasks/exp3)과 같은 조건을 기록한다. 판정 · 점수에 쓰지 않는다(설계 §8.3).
// run.sh 의 진단 묶음(diag-exp3-1024)은 판정 묶음과 따로 실행돼 종료 코드 · JUnit · 애플리케이션을 공유하지 않는다.
// screenshot 과 측정값은 시험 결과와 관계없이 Playwright outputDir 의 이 시험 디렉터리에 파일로 남는다.

const VIEWPORT = { width: 1024, height: 768 };

test.describe.serial('긴 부서명 진단', () => {
  test('부서명 80자 · 120자 계정 생성', async ({ admin }) => {
    expect(await createLongDepartmentStaff(admin, 'diag')).toEqual([80, 120]);
  });

  test(`${VIEWPORT.width}×${VIEWPORT.height} 에서 액션 버튼이 스크롤 없이 보인다`, async ({ page }, testInfo) => {
    await openStaffList(page, VIEWPORT, 'diag');
    await page.screenshot({ path: testInfo.outputPath('staff-1024x768.png'), fullPage: true });
    const m = await measureStaffList(page, VIEWPORT.width, 'diag');
    writeFileSync(testInfo.outputPath('measure.json'), `${JSON.stringify(m, null, 2)}\n`);
    expect(m.headers).toEqual(['로그인 ID', '이름', '부서', '역할', '상태', '처리']);
    expect(m.departmentCellVisible).toEqual({ 'diag.long80': true, 'diag.long120': true });
    expect(m.scrollLeft).toBe(0);
    expect(m.buttons.length).toBeGreaterThan(0);
    for (const b of m.buttons) {
      expect(b.visible, b.label).toBe(true);
      expect(b.left, b.label).toBeGreaterThanOrEqual(m.bounds.left - 0.5);
      expect(b.right, b.label).toBeLessThanOrEqual(m.bounds.right + 0.5);
    }
  });
});
