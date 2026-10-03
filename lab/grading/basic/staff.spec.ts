import { STAFF_KEYS, body, err, errorOf, expect, expectKeys, loginAs, test, type Staff } from '../support/api';
import { T0, seed } from '../support/seed';

const PASSWORD = 'Passw0rd!';

function staffBody(loginId: string, overrides: Record<string, unknown> = {}) {
  return { loginId, name: '채점 계정', department: '운영팀', role: 'OPERATOR', password: PASSWORD, ...overrides };
}

test('[STF-01] 관리자 계정 생성', async ({ admin }) => {
  const s = await body<Staff>(await admin.post('/api/admin/staff', { data: staffBody('grading.stf01') }), 201);
  expectKeys(s, STAFF_KEYS);
  expect(s).toMatchObject({ loginId: 'grading.stf01', name: '채점 계정', department: '운영팀', role: 'OPERATOR', active: true, createdAt: T0 });
  const ctx = await loginAs('grading.stf01', PASSWORD);
  expect((await body<{ loginId: string }>(await ctx.get('/api/auth/me'))).loginId).toBe('grading.stf01');
  await ctx.dispose();
});

test('[STF-02] 이미 있는 로그인 ID', async ({ admin }) => {
  expect(await errorOf(await admin.post('/api/admin/staff', { data: staffBody('admin') }))).toEqual(err('STAFF_LOGIN_ID_DUPLICATED'));
});

test('[STF-03] 역할 변경', async ({ admin }) => {
  const s = await body<Staff>(await admin.post('/api/admin/staff', { data: staffBody('grading.stf03') }), 201);
  const changed = await body<Staff>(await admin.patch(`/api/admin/staff/${s.id}/role`, { data: { role: 'ADMIN' } }));
  expect(changed).toMatchObject({ id: s.id, role: 'ADMIN' });
  expect(await errorOf(await admin.patch('/api/admin/staff/9999/role', { data: { role: 'ADMIN' } }))).toEqual(err('STAFF_NOT_FOUND'));
});

test('[STF-04] 비활성화는 반복해도 200', async ({ admin }) => {
  const s = await body<Staff>(await admin.post('/api/admin/staff', { data: staffBody('grading.stf04') }), 201);
  expect((await body<Staff>(await admin.post(`/api/admin/staff/${s.id}/deactivate`))).active).toBe(false);
  expect((await body<Staff>(await admin.post(`/api/admin/staff/${s.id}/deactivate`))).active).toBe(false);
});

test('[STF-05] 부서명은 200자까지', async ({ admin }) => {
  const res201 = await admin.post('/api/admin/staff', { data: staffBody('grading.stf05a', { department: '가'.repeat(201) }) });
  expect(await errorOf(res201)).toEqual(err('VALIDATION_FAILED'));
  const ok = await body<Staff>(await admin.post('/api/admin/staff', { data: staffBody('grading.stf05b', { department: '가'.repeat(200) }) }), 201);
  expect(ok.department).toHaveLength(200);
});

test('[STF-06] 관리자 계정 목록은 ID 오름차순이고 비밀번호가 없다', async ({ admin }) => {
  const list = await body<Staff[]>(await admin.get('/api/admin/staff'));
  const ids = list.map((s) => s.id);
  expect(ids.slice(0, seed.staff.length)).toEqual(seed.staff.map((s) => s.id));
  expect(ids).toEqual([...ids].sort((a, b) => a - b));
  for (const s of list) expectKeys(s, STAFF_KEYS);
});

test('[STF-08] 로그인 ID 형식', async ({ admin }) => {
  expect(await errorOf(await admin.post('/api/admin/staff', { data: staffBody('AB') }))).toEqual(err('VALIDATION_FAILED'));
  expect(await errorOf(await admin.post('/api/admin/staff', { data: staffBody('Grading') }))).toEqual(err('VALIDATION_FAILED'));
  expect(await errorOf(await admin.post('/api/admin/staff', { data: staffBody('grading.pw', { password: 'short' }) }))).toEqual(err('VALIDATION_FAILED'));
});
