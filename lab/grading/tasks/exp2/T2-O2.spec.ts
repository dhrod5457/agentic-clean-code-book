import { ORDER_SUMMARY_KEYS } from '../../support/api';
import { seed } from '../../support/seed';
import { LABELS, dateTime, won } from '../../support/ui';
import { defineListTask } from './list-task';

defineListTask({
  id: 'T2-O2', title: '고액 주문', path: '/orders/high-value', group: '주문',
  api: '/api/admin/orders/high-value', sourceApi: '/api/admin/orders', keys: ORDER_SUMMARY_KEYS,
  expected: seed.orders
    .filter((o) => o.total_amount >= 500_000)
    .sort((a, b) => b.total_amount - a.total_amount || b.id - a.id),
  columns: ['ID', '회원 ID', '상태', '결제 금액', '주문일시'],
  rowCells: (o) => [String(o.id), String(o.member_id), LABELS.orderStatus[o.status], won(o.total_amount), dateTime(o.created_at)],
});
