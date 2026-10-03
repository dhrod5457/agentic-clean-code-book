import { expect, test, type Page } from '@playwright/test';
import { activeGenerals, seed } from '../support/seed';
import { LABELS, bodyRows, dateTime, definitionList, expectPath, headers, loginUi, mainTable, orNull, readMenu, waitRows, won } from '../support/ui';

// 화면 시험은 데이터를 바꾸지 않는다. seed 상태 그대로 표시를 확인한다.

const MENU = [
  { group: '회원', items: ['회원 목록'] },
  { group: '주문', items: ['주문 목록'] },
  { group: '배송', items: ['배송 목록', '배송 정책'] },
  { group: '환불', items: ['환불 목록'] },
  { group: '설정', items: ['관리자 계정'] },
];

async function open(page: Page, path: string, title: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

const byIdDesc = <T extends { id: number }>(rows: T[]) => [...rows].sort((a, b) => b.id - a.id);

test.describe('로그인 · 메뉴', () => {
  test('[AUT-09] 로그인 실패 메시지', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: '쇼핑몰 관리자 로그인' })).toBeVisible();
    await page.getByLabel('로그인 ID').fill('admin');
    await page.getByLabel('비밀번호').fill('wrong-password');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByRole('alert')).toContainText('아이디 또는 비밀번호가 올바르지 않습니다.');
  });

  test('로그인하지 않으면 로그인 화면으로 이동', async ({ page }) => {
    await page.goto('/orders');
    await expectPath(page, '/login');
    await expect(page.getByRole('heading', { level: 1, name: '쇼핑몰 관리자 로그인' })).toBeVisible();
  });

  test('[AUT-10] 메뉴 그룹과 항목 순서', async ({ page }) => {
    await loginUi(page, 'admin');
    await expect(page.getByRole('heading', { level: 1, name: '회원 목록' })).toBeVisible();
    expect(await readMenu(page)).toEqual(MENU);
    await page.goto('/');
    await expectPath(page, '/members');
  });

  test('[E2E-01] admin 로그인 후 회원 목록과 메뉴 그룹 5개', async ({ page }) => {
    await loginUi(page, 'admin');
    await expect(page.getByRole('heading', { level: 1, name: '회원 목록' })).toBeVisible();
    expect((await readMenu(page)).map((g) => g.group)).toEqual(['회원', '주문', '배송', '환불', '설정']);
  });

  test('[E2E-02] operator 는 회원 상세에 쓰기 버튼이 없고 배송 목록에 출고 처리가 있다', async ({ page }) => {
    await loginUi(page, 'operator');
    await open(page, `/members/${activeGenerals[0].id}`, '회원 상세');
    expect((await definitionList(page)).ID).toBe(String(activeGenerals[0].id));
    await expect(page.getByRole('button', { name: '탈퇴 처리' })).toHaveCount(0);
    await open(page, '/deliveries', '배송 목록');
    await expect(mainTable(page).getByRole('button', { name: '출고 처리' }).first()).toBeVisible();
  });

  test('OPERATOR 도 같은 메뉴를 본다', async ({ page }) => {
    await loginUi(page, 'operator');
    expect(await readMenu(page)).toEqual(MENU);
  });

  test('로그아웃', async ({ page }) => {
    await loginUi(page, 'admin');
    await expect(page.getByText('김지훈 (관리자)')).toBeVisible();
    await page.getByRole('button', { name: '로그아웃' }).click();
    await expectPath(page, '/login');
    await page.goto('/members');
    await expectPath(page, '/login');
  });
});

test.describe('ADMIN 화면', () => {
  test.beforeEach(async ({ page }) => {
    await loginUi(page, 'admin');
  });

  test('[MBR-09] 회원 목록', async ({ page }) => {
    await open(page, '/members', '회원 목록');
    const table = mainTable(page);
    await waitRows(table, seed.members.length);
    expect(await headers(table)).toEqual(['ID', '이름', '이메일', '등급', '상태', '가입일시', '마지막 로그인']);
    const rows = await bodyRows(table);
    const m = seed.members[0];
    expect(rows[0]).toEqual([String(m.id), m.name, m.email, LABELS.grade[m.grade], LABELS.memberStatus[m.status],
      dateTime(m.joined_at), dateTime(m.last_login_at)]);
  });

  test('[MBR-10] 회원 상세와 쓰기 버튼', async ({ page }) => {
    const m = activeGenerals[0];
    await open(page, `/members/${m.id}`, '회원 상세');
    expect(await definitionList(page)).toEqual({
      ID: String(m.id), 이름: m.name, 이메일: m.email, 등급: '일반', 상태: '활성',
      가입일시: dateTime(m.joined_at), '마지막 로그인': dateTime(m.last_login_at), 탈퇴일시: '-',
    });
    for (const name of ['정지', 'VIP로 변경', '탈퇴 처리']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    for (const name of ['정지 해제', '일반으로 변경']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    const withdrawn = seed.members.find((x) => x.status === 'WITHDRAWN')!;
    await open(page, `/members/${withdrawn.id}`, '회원 상세');
    expect((await definitionList(page)).상태).toBe('탈퇴');
    for (const name of ['정지', '정지 해제', 'VIP로 변경', '일반으로 변경', '탈퇴 처리']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    }
  });

  test('[ORD-13] 주문 목록', async ({ page }) => {
    await open(page, '/orders', '주문 목록');
    const table = mainTable(page);
    await waitRows(table, seed.orders.length);
    expect(await headers(table)).toEqual(['ID', '회원 ID', '상태', '상품 금액', '배송비', '결제 금액', '주문일시', '결제일시']);
    const rows = await bodyRows(table);
    const o = byIdDesc(seed.orders)[0];
    expect(rows[0]).toEqual([String(o.id), String(o.member_id), LABELS.orderStatus[o.status], won(o.product_amount),
      won(o.delivery_fee), won(o.total_amount), dateTime(o.created_at), dateTime(o.paid_at)]);
    await expect(page.getByRole('button', { name: '만료 처리' })).toBeVisible();
  });

  test('[ORD-14] 주문 상세', async ({ page }) => {
    const o = seed.orders.find((x) => x.status === 'PAID')!;
    await open(page, `/orders/${o.id}`, '주문 상세');
    expect(await definitionList(page)).toEqual({
      ID: String(o.id), '회원 ID': String(o.member_id), 상태: '결제 완료', '상품 금액': won(o.product_amount),
      배송비: won(o.delivery_fee), '결제 금액': won(o.total_amount), 주문일시: dateTime(o.created_at),
      결제일시: dateTime(o.paid_at), 만료일시: '-',
    });
    await expect(mainTable(page).locator('tbody tr').first()).toBeVisible();
    expect(await headers(mainTable(page))).toEqual(['상품명', '단가', '수량', '금액']);
  });

  test('[DLV-10] 배송 목록과 상태별 버튼', async ({ page }) => {
    await open(page, '/deliveries', '배송 목록');
    const table = mainTable(page);
    await waitRows(table, seed.deliveries.length);
    expect(await headers(table)).toEqual(['ID', '주문 ID', '상태', '배송비', '등록일시', '출고일시', '도착일시', '처리']);
    const d = byIdDesc(seed.deliveries)[0];
    expect((await bodyRows(table))[0].slice(0, 7)).toEqual([String(d.id), String(d.order_id), LABELS.deliveryStatus[d.status],
      won(d.fee), dateTime(d.created_at), dateTime(d.shipped_at), dateTime(d.delivered_at)]);
    await expect(table.getByRole('button', { name: '출고 처리' })).toHaveCount(seed.deliveries.filter((x) => x.status === 'READY').length);
    await expect(table.getByRole('button', { name: '도착 처리' })).toHaveCount(seed.deliveries.filter((x) => x.status === 'SHIPPED').length);
  });

  test('[DLV-11] 배송 정책', async ({ page }) => {
    await open(page, '/delivery-policy', '배송 정책');
    expect(await definitionList(page)).toEqual({ '기본 배송비': '3,000원', 'VIP 무료배송 기준 금액': '150,000원' });
    await expect(page.getByText('VIP 회원의 상품 금액이 기준 금액 이상이면 배송비가 0원입니다.')).toBeVisible();
  });

  test('[RFD-15] 환불 목록과 처리 버튼', async ({ page }) => {
    await open(page, '/refunds', '환불 목록');
    const table = mainTable(page);
    await waitRows(table, seed.refunds.length);
    expect(await headers(table)).toEqual(['ID', '주문 ID', '구분', '요청 금액', '배송비 차감', '환불 금액', '상태', '요청일시', '처리일시', '처리']);
    const r = byIdDesc(seed.refunds)[0];
    expect((await bodyRows(table))[0].slice(0, 9)).toEqual([String(r.id), String(r.order_id), LABELS.partial[String(r.partial)],
      won(r.amount), orNull(r.delivery_fee_deduction), orNull(r.refunded_amount), LABELS.refundStatus[r.status],
      dateTime(r.requested_at), dateTime(r.processed_at)]);
    const requested = seed.refunds.filter((x) => x.status === 'REQUESTED').length;
    await expect(table.getByRole('button', { name: '승인' })).toHaveCount(requested);
    await expect(table.getByRole('button', { name: '거절' })).toHaveCount(requested);
    await expect(page.getByRole('button', { name: '환불 요청 등록' })).toBeVisible();
  });

  test('[STF-07] 관리자 계정 목록과 처리 버튼', async ({ page }) => {
    await open(page, '/staff', '관리자 계정');
    const table = mainTable(page);
    await waitRows(table, seed.staff.length);
    expect(await headers(table)).toEqual(['로그인 ID', '이름', '부서', '역할', '상태', '처리']);
    const s = seed.staff[0];
    expect((await bodyRows(table))[0].slice(0, 5)).toEqual([s.login_id, s.name, s.department, LABELS.role[s.role], LABELS.active[String(s.active)]]);
    const active = seed.staff.filter((x) => x.active).length;
    await expect(table.getByRole('button', { name: '수정' })).toHaveCount(active);
    await expect(table.getByRole('button', { name: '비활성화' })).toHaveCount(active);
    await expect(page.getByRole('button', { name: '관리자 계정 추가' })).toBeVisible();
  });
});

test.describe('OPERATOR 화면', () => {
  test.beforeEach(async ({ page }) => {
    await loginUi(page, 'operator');
  });

  test('회원 상세에 쓰기 버튼이 없다', async ({ page }) => {
    await open(page, `/members/${activeGenerals[0].id}`, '회원 상세');
    expect((await definitionList(page)).상태).toBe('활성');
    for (const name of ['정지', 'VIP로 변경', '탈퇴 처리']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  });

  test('주문 목록에 만료 처리 버튼이 없다', async ({ page }) => {
    await open(page, '/orders', '주문 목록');
    await waitRows(mainTable(page), seed.orders.length);
    await expect(page.getByRole('button', { name: '만료 처리' })).toHaveCount(0);
  });

  test('배송 목록에는 처리 버튼이 있다', async ({ page }) => {
    await open(page, '/deliveries', '배송 목록');
    await waitRows(mainTable(page), seed.deliveries.length);
    expect(await headers(mainTable(page))).toContain('처리');
    await expect(mainTable(page).getByRole('button', { name: '출고 처리' })).toHaveCount(seed.deliveries.filter((x) => x.status === 'READY').length);
  });

  test('환불 목록에 처리 열과 등록 버튼이 없다', async ({ page }) => {
    await open(page, '/refunds', '환불 목록');
    await waitRows(mainTable(page), seed.refunds.length);
    expect(await headers(mainTable(page))).not.toContain('처리');
    await expect(page.getByRole('button', { name: '환불 요청 등록' })).toHaveCount(0);
  });

  test('관리자 계정 목록에 처리 열과 추가 버튼이 없다', async ({ page }) => {
    await open(page, '/staff', '관리자 계정');
    await waitRows(mainTable(page), seed.staff.length);
    expect(await headers(mainTable(page))).toEqual(['로그인 ID', '이름', '부서', '역할', '상태']);
    await expect(page.getByRole('button', { name: '관리자 계정 추가' })).toHaveCount(0);
  });
});
