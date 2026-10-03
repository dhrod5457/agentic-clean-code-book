import { MEMBER_KEYS } from '../../support/api';
import { DAY, T0_MS, ms, seed } from '../../support/seed';
import { dateTime } from '../../support/ui';
import { defineListTask } from './list-task';

defineListTask({
  id: 'T2-M2', title: '최근 탈퇴 회원', path: '/members/withdrawn', group: '회원',
  api: '/api/admin/members/withdrawn', sourceApi: '/api/admin/members', keys: MEMBER_KEYS,
  expected: seed.members
    .filter((m) => m.status === 'WITHDRAWN' && m.withdrawn_at !== null && ms(m.withdrawn_at) >= T0_MS - 30 * DAY)
    .sort((a, b) => ms(b.withdrawn_at!) - ms(a.withdrawn_at!) || b.id - a.id),
  columns: ['ID', '이름', '이메일', '탈퇴일시'],
  firstRowCells: (m) => [String(m.id), m.name, m.email, dateTime(m.withdrawn_at)],
});
