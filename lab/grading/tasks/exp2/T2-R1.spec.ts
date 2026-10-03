import { REFUND_KEYS } from '../../support/api';
import { DAY, T0_MS, ms, seed } from '../../support/seed';
import { dateTime, won } from '../../support/ui';
import { defineListTask } from './list-task';

defineListTask({
  id: 'T2-R1', title: '처리 지연 환불', path: '/refunds/stale', group: '환불',
  api: '/api/admin/refunds/stale', sourceApi: '/api/admin/refunds', keys: REFUND_KEYS,
  expected: seed.refunds
    .filter((r) => r.status === 'REQUESTED' && ms(r.requested_at) < T0_MS - 2 * DAY)
    .sort((a, b) => ms(a.requested_at) - ms(b.requested_at) || a.id - b.id),
  columns: ['ID', '주문 ID', '요청 금액', '요청일시'],
  firstRowCells: (r) => [String(r.id), String(r.order_id), won(r.amount), dateTime(r.requested_at)],
});
