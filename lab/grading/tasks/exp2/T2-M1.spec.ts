import { MEMBER_KEYS } from '../../support/api';
import { DAY, T0_MS, ms, seed } from '../../support/seed';
import { LABELS, dateTime } from '../../support/ui';
import { defineListTask } from './list-task';

defineListTask({
  id: 'T2-M1', title: '휴면 회원', path: '/members/dormant', group: '회원',
  api: '/api/admin/members/dormant', sourceApi: '/api/admin/members', keys: MEMBER_KEYS,
  expected: seed.members
    .filter((m) => m.status === 'ACTIVE' && ms(m.last_login_at) <= T0_MS - 365 * DAY)
    .sort((a, b) => ms(a.last_login_at) - ms(b.last_login_at) || a.id - b.id),
  columns: ['ID', '이름', '이메일', '등급', '마지막 로그인'],
  rowCells: (m) => [String(m.id), m.name, m.email, LABELS.grade[m.grade], dateTime(m.last_login_at)],
});
