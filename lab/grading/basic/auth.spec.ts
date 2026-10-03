import {
  PASSWORD, anonymous, body, createPaidOrder, deliveryOfOrder, err, errorOf, expect, loginAs, setDeliveryStatus, test,
  type Staff,
} from '../support/api';
import { activeGenerals, seed } from '../support/seed';

const ALL = ['MEMBER_READ', 'MEMBER_WRITE', 'ORDER_READ', 'ORDER_WRITE', 'DELIVERY_READ', 'DELIVERY_WRITE',
  'REFUND_READ', 'REFUND_WRITE', 'STAFF_READ', 'STAFF_WRITE'];
const OPERATOR = ['MEMBER_READ', 'ORDER_READ', 'DELIVERY_READ', 'DELIVERY_WRITE', 'REFUND_READ', 'STAFF_READ'];
const inactive = seed.staff.find((s) => !s.active)!.login_id;
const gradeTarget = activeGenerals[4].id;

test('[AUT-01] 로그인 성공', async ({ anon }) => {
  const res = await anon.post('/api/auth/login', { data: { loginId: 'admin', password: PASSWORD } });
  expect(res.headers()['set-cookie'] ?? '').not.toBe('');
  expect(await body(res)).toEqual({ id: 1, loginId: 'admin', name: '김지훈', role: 'ADMIN', permissions: ALL });
});

test('[AUT-02] 틀린 비밀번호', async ({ anon }) => {
  const res = await anon.post('/api/auth/login', { data: { loginId: 'admin', password: 'wrong-password' } });
  expect(await errorOf(res)).toEqual(err('AUTH_FAILED'));
});

test('[AUT-03] 비활성 계정은 로그인할 수 없다', async ({ anon }) => {
  const res = await anon.post('/api/auth/login', { data: { loginId: inactive, password: PASSWORD } });
  expect(await errorOf(res)).toEqual(err('AUTH_FAILED'));
});

test('[AUT-04] 로그인 없이 관리자 API', async ({ anon }) => {
  expect(await errorOf(await anon.get('/api/admin/members'))).toEqual(err('AUTH_REQUIRED'));
  expect(await errorOf(await anon.get('/api/auth/me'))).toEqual(err('AUTH_REQUIRED'));
});

test('[AUT-05] OPERATOR 는 회원 등급을 바꿀 수 없다', async ({ operator }) => {
  const res = await operator.patch(`/api/admin/members/${gradeTarget}/grade`, { data: { grade: 'VIP' } });
  expect(await errorOf(res)).toEqual(err('ACCESS_DENIED'));
  expect(await errorOf(await operator.post('/api/admin/orders/expire-overdue'))).toEqual(err('ACCESS_DENIED'));
});

test('[AUT-06] OPERATOR 는 배송 상태를 바꿀 수 있다', async ({ anon, admin, operator }) => {
  const order = await createPaidOrder(anon, activeGenerals[0].id, 30_000);
  const d = await deliveryOfOrder(admin, order.id);
  expect((await body<{ status: string }>(await setDeliveryStatus(operator, d.id, 'SHIPPED'))).status).toBe('SHIPPED');
});

test('[AUT-07] 로그아웃 후에는 로그인이 필요하다', async () => {
  const ctx = await loginAs('admin');
  expect((await ctx.post('/api/auth/logout')).status()).toBe(204);
  expect(await errorOf(await ctx.get('/api/auth/me'))).toEqual(err('AUTH_REQUIRED'));
  await ctx.dispose();
});

test('[AUT-08] OPERATOR 의 권한 목록', async ({ operator }) => {
  expect(await body(await operator.get('/api/auth/me'))).toMatchObject({ loginId: 'operator', role: 'OPERATOR', permissions: OPERATOR });
});

test('[AUT-11] 역할 변경과 비활성화는 다음 요청부터 적용된다', async ({ admin }) => {
  const s = await body<Staff>(await admin.post('/api/admin/staff', {
    data: { loginId: 'grading.aut11', name: '채점 계정', department: '운영팀', role: 'OPERATOR', password: 'Passw0rd!' },
  }), 201);
  const session = await loginAs('grading.aut11', 'Passw0rd!');
  expect(await errorOf(await session.patch(`/api/admin/members/${gradeTarget}/grade`, { data: { grade: 'VIP' } }))).toEqual(err('ACCESS_DENIED'));
  await body(await admin.patch(`/api/admin/staff/${s.id}/role`, { data: { role: 'ADMIN' } }));
  expect((await body<{ grade: string }>(await session.patch(`/api/admin/members/${gradeTarget}/grade`, { data: { grade: 'VIP' } }))).grade).toBe('VIP');
  await body(await admin.post(`/api/admin/staff/${s.id}/deactivate`));
  expect(await errorOf(await session.get('/api/auth/me'))).toEqual(err('AUTH_REQUIRED'));
  await session.dispose();
});

test('[AUT-12] 로그인 요청은 값이 있는지만 검사한다', async () => {
  const ctx = await anonymous();
  expect(await errorOf(await ctx.post('/api/auth/login', { data: { loginId: 'AB', password: 'x' } }))).toEqual(err('AUTH_FAILED'));
  expect(await errorOf(await ctx.post('/api/auth/login', { data: { loginId: '', password: 'x' } }))).toEqual(err('VALIDATION_FAILED'));
  await ctx.dispose();
});
