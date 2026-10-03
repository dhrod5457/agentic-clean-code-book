import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { body } from '../../support/api';
import { headers, loginUi, mainTable } from '../../support/ui';

// 실험 3 의 채점(tasks/exp3)과 진단(diagnostics/exp3-1024)이 같이 쓰는 절차. 단정은 각 시험에 둔다

function department(length: number): string {
  const words = '글로벌 이커머스 플랫폼 운영 본부 고객 경험 혁신 담당 ';
  let s = '';
  while (s.length < length) s += words;
  s = s.slice(0, length);
  return s.endsWith(' ') ? `${s.slice(0, -1)}부` : s;
}

// 채점과 진단은 다른 loginId 를 쓴다. 한 애플리케이션에서 두 파일을 같이 실행해도 계정 생성이 겹치지 않는다
export type StaffPrefix = 'grading' | 'diag';

function longStaff(prefix: StaffPrefix) {
  return [[`${prefix}.long80`, 80], [`${prefix}.long120`, 120]] as const;
}

// 만든 계정의 부서명 길이를 돌려준다
export async function createLongDepartmentStaff(admin: APIRequestContext, prefix: StaffPrefix): Promise<number[]> {
  const lengths: number[] = [];
  for (const [loginId, length] of longStaff(prefix)) {
    const created = await body<{ department: string }>(await admin.post('/api/admin/staff', {
      data: { loginId, name: `긴 부서 ${length}`, department: department(length), role: 'OPERATOR', password: 'Passw0rd!' },
    }), 201);
    lengths.push(created.department.length);
  }
  return lengths;
}

export async function openStaffList(page: Page, viewport: { width: number; height: number }, prefix: StaffPrefix): Promise<void> {
  await page.setViewportSize(viewport);
  await loginUi(page, 'admin');
  await page.goto('/staff');
  await expect(page.getByRole('heading', { level: 1, name: '관리자 계정' })).toBeVisible();
  await expect(mainTable(page).locator('tbody tr').filter({ hasText: `${prefix}.long120` })).toHaveCount(1);
}

export interface StaffListMeasure {
  headers: string[];
  // loginId 별 부서 셀 표시 여부
  departmentCellVisible: Record<string, boolean>;
  scrollLeft: number;
  // 표 컨테이너와 viewport 가 겹치는 가로 범위
  bounds: { left: number; right: number };
  // 화면에 그려지지 않은 버튼은 left · right 가 null 이다
  buttons: { label: string; visible: boolean; left: number | null; right: number | null }[];
}

// 열려 있는 관리자 계정 목록의 열 구성, 긴 부서명 셀, 액션 버튼 위치를 잰다
export async function measureStaffList(page: Page, viewportWidth: number, prefix: StaffPrefix): Promise<StaffListMeasure> {
  const table = mainTable(page);

  const departmentCellVisible: Record<string, boolean> = {};
  for (const [loginId] of longStaff(prefix)) {
    departmentCellVisible[loginId] = await table.locator('tbody tr').filter({ hasText: loginId }).locator('td').nth(2).isVisible();
  }

  // 표를 감싸는 가로 스크롤 컨테이너. 없으면 표의 부모 요소
  const container = await table.evaluate((el) => {
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

  const buttons: StaffListMeasure['buttons'] = [];
  const locator = table.getByRole('button', { name: /^(수정|비활성화)$/ });
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const b = locator.nth(i);
    const box = await b.boundingBox();
    buttons.push({
      label: `${await b.textContent()} #${i} (viewport ${viewportWidth})`,
      visible: await b.isVisible(),
      left: box ? box.x : null,
      right: box ? box.x + box.width : null,
    });
  }

  return {
    headers: await headers(table),
    departmentCellVisible,
    scrollLeft: container.scrollLeft,
    bounds: { left: Math.max(0, container.x), right: Math.min(viewportWidth, container.x + container.width) },
    buttons,
  };
}
