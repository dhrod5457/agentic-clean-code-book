import { expect, type Page } from '@playwright/test';
import { body, err, errorOf, expectKeys, test } from '../../support/api';
import { bodyRows, expectPath, headers, loginUi, mainNav, mainTable, readMenu, waitRows } from '../../support/ui';

// 실험 2 의 조회 화면 과제 하나를 채점하는 시험 묶음을 만든다. 조건 · 정렬 · 열은 lab/tasks/exp2/<ID>/prompt.md 와 같다.
export interface ListTask<Row extends { id: number }> {
  id: string;
  title: string;
  path: string;
  group: string;
  api: string;
  // 같은 객체 형식의 기존 목록 API
  sourceApi: string;
  keys: string[];
  expected: Row[];
  columns: string[];
  firstRowCells: (row: Row) => string[];
}

const collator = new Intl.Collator('ko');

export function defineListTask<Row extends { id: number }>(task: ListTask<Row>): void {
  test.describe(task.id, () => {
    test('API 가 조건과 정렬대로 행을 돌려준다', async ({ admin }) => {
      expect(task.expected.length, 'seed 에 조건에 맞는 행이 있어야 한다').toBeGreaterThan(0);
      const rows = await body<Record<string, unknown>[]>(await admin.get(task.api));
      expect(rows.map((r) => r.id)).toEqual(task.expected.map((r) => r.id));
      const source = await body<Record<string, unknown>[]>(await admin.get(task.sourceApi));
      const byId = new Map(source.map((r) => [r.id, r]));
      for (const r of rows) {
        expectKeys(r, task.keys);
        expect(r).toEqual(byId.get(r.id));
      }
    });

    test('로그인하지 않으면 401, OPERATOR 는 조회할 수 있다', async ({ anon, operator }) => {
      expect(await errorOf(await anon.get(task.api))).toEqual(err('AUTH_REQUIRED'));
      expect((await body<unknown[]>(await operator.get(task.api))).length).toBe(task.expected.length);
    });

    for (const role of ['admin', 'operator']) {
      test(`${role} 메뉴에서 화면을 연다`, async ({ page }) => {
        await loginUi(page, role);
        const group = (await readMenu(page)).find((g) => g.group === task.group);
        expect(group?.items, `${task.group} 그룹`).toContain(task.title);
        expect(group!.items).toEqual([...group!.items].sort(collator.compare));
        await mainNav(page).getByRole('link', { name: task.title, exact: true }).click();
        await checkScreen(page, task);
      });
    }
  });
}

async function checkScreen<Row extends { id: number }>(page: Page, task: ListTask<Row>) {
  await expectPath(page, task.path);
  await expect(page.getByRole('heading', { level: 1, name: task.title })).toBeVisible();
  const table = mainTable(page);
  await waitRows(table, task.expected.length);
  expect(await headers(table)).toEqual(task.columns);
  const rows = await bodyRows(table);
  expect(rows.map((r) => r[0])).toEqual(task.expected.map((r) => String(r.id)));
  expect(rows[0]).toEqual(task.firstRowCells(task.expected[0]));
}
