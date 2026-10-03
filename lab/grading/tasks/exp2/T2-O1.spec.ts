import { ORDER_SUMMARY_KEYS } from '../../support/api';
import { MINUTE, T0_MS, ms, seed } from '../../support/seed';
import { dateTime, won } from '../../support/ui';
import { defineListTask } from './list-task';

const deadline = (createdAt: string) => ms(createdAt) + 30 * MINUTE;

defineListTask({
  id: 'T2-O1', title: '만료 임박 주문', path: '/orders/expiring', group: '주문',
  api: '/api/admin/orders/expiring', sourceApi: '/api/admin/orders', keys: ORDER_SUMMARY_KEYS,
  expected: seed.orders
    .filter((o) => o.status === 'PENDING_PAYMENT' && deadline(o.created_at) > T0_MS && deadline(o.created_at) <= T0_MS + 10 * MINUTE)
    .sort((a, b) => ms(a.created_at) - ms(b.created_at) || a.id - b.id),
  columns: ['ID', '회원 ID', '결제 금액', '주문일시'],
  rowCells: (o) => [String(o.id), String(o.member_id), won(o.total_amount), dateTime(o.created_at)],
});
