import { MEMBER_KEYS, body, err, errorOf, expect, expectKeys, test, type Member } from '../support/api';
import { T0, activeGenerals, seed } from '../support/seed';

// 회원은 API 로 만들 수 없어서 seed 회원을 시험마다 다르게 고른다
const toSuspend = activeGenerals[1].id;
const toUpgrade = activeGenerals[2].id;
const toWithdraw = activeGenerals[3].id;
const suspended = seed.members.filter((m) => m.status === 'SUSPENDED').at(-1)!.id;
const withdrawn = seed.members.filter((m) => m.status === 'WITHDRAWN').at(-1)!.id;

test('[MBR-01] 활성 회원 정지', async ({ admin }) => {
  const m = await body<Member>(await admin.patch(`/api/admin/members/${toSuspend}/status`, { data: { status: 'SUSPENDED' } }));
  expect(m).toMatchObject({ id: toSuspend, status: 'SUSPENDED' });
  const again = await body<Member>(await admin.patch(`/api/admin/members/${toSuspend}/status`, { data: { status: 'SUSPENDED' } }));
  expect(again.status).toBe('SUSPENDED');
});

test('[MBR-02] 정지 해제', async ({ admin }) => {
  const m = await body<Member>(await admin.patch(`/api/admin/members/${suspended}/status`, { data: { status: 'ACTIVE' } }));
  expect(m).toMatchObject({ id: suspended, status: 'ACTIVE' });
});

test('[MBR-03] 등급 변경', async ({ admin }) => {
  const m = await body<Member>(await admin.patch(`/api/admin/members/${toUpgrade}/grade`, { data: { grade: 'VIP' } }));
  expect(m).toMatchObject({ id: toUpgrade, grade: 'VIP' });
  expect((await body<Member>(await admin.get(`/api/admin/members/${toUpgrade}`))).grade).toBe('VIP');
});

test('[MBR-04] 탈퇴 처리', async ({ admin }) => {
  const m = await body<Member>(await admin.post(`/api/admin/members/${toWithdraw}/withdraw`));
  expect(m).toMatchObject({ id: toWithdraw, status: 'WITHDRAWN', withdrawnAt: T0 });
});

test('[MBR-05] 탈퇴 회원은 바꿀 수 없다', async ({ admin }) => {
  expect(await errorOf(await admin.patch(`/api/admin/members/${withdrawn}/status`, { data: { status: 'ACTIVE' } }))).toEqual(err('MEMBER_WITHDRAWN'));
  expect(await errorOf(await admin.patch(`/api/admin/members/${withdrawn}/grade`, { data: { grade: 'VIP' } }))).toEqual(err('MEMBER_WITHDRAWN'));
  expect(await errorOf(await admin.post(`/api/admin/members/${withdrawn}/withdraw`))).toEqual(err('MEMBER_WITHDRAWN'));
});

test('[MBR-06] 상태 변경으로 탈퇴 값을 보낼 수 없다', async ({ admin }) => {
  const res = await admin.patch(`/api/admin/members/${toSuspend}/status`, { data: { status: 'WITHDRAWN' } });
  expect(await errorOf(res)).toEqual(err('VALIDATION_FAILED'));
  expect(await errorOf(await admin.get('/api/admin/members/abc'))).toEqual(err('VALIDATION_FAILED'));
});

test('[MBR-07] 없는 회원', async ({ admin }) => {
  expect(await errorOf(await admin.get('/api/admin/members/9999'))).toEqual(err('MEMBER_NOT_FOUND'));
});

test('[MBR-08] 회원 목록은 ID 오름차순이고 seed 값과 같다', async ({ admin }) => {
  const list = await body<Member[]>(await admin.get('/api/admin/members'));
  expect(list.map((m) => m.id)).toEqual(seed.members.map((m) => m.id));
  expectKeys(list[0], MEMBER_KEYS);
  const first = seed.members[0];
  expect(list[0]).toEqual({
    id: first.id, name: first.name, email: first.email, grade: first.grade, status: first.status,
    joinedAt: first.joined_at, lastLoginAt: first.last_login_at, withdrawnAt: first.withdrawn_at,
  });
});
