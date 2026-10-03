import { REFUND_KEYS } from '../../support/api';
import { seed } from '../../support/seed';
import { LABELS, orNull, won } from '../../support/ui';
import { defineListTask } from './list-task';

defineListTask({
  id: 'T2-R2', title: '부분 환불', path: '/refunds/partial', group: '환불',
  api: '/api/admin/refunds/partial', sourceApi: '/api/admin/refunds', keys: REFUND_KEYS,
  expected: seed.refunds.filter((r) => r.partial).sort((a, b) => b.id - a.id),
  columns: ['ID', '주문 ID', '요청 금액', '배송비 차감', '환불 금액', '상태'],
  firstRowCells: (r) => [String(r.id), String(r.order_id), won(r.amount), orNull(r.delivery_fee_deduction), orNull(r.refunded_amount), LABELS.refundStatus[r.status]],
});
