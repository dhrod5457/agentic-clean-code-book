import { DELIVERY_KEYS } from '../../support/api';
import { seed } from '../../support/seed';
import { LABELS, dateTime } from '../../support/ui';
import { defineListTask } from './list-task';

defineListTask({
  id: 'T2-D2', title: '무료배송 배송', path: '/deliveries/free-shipping', group: '배송',
  api: '/api/admin/deliveries/free-shipping', sourceApi: '/api/admin/deliveries', keys: DELIVERY_KEYS,
  expected: seed.deliveries.filter((d) => d.fee === 0).sort((a, b) => b.id - a.id),
  columns: ['ID', '주문 ID', '상태', '등록일시'],
  firstRowCells: (d) => [String(d.id), String(d.order_id), LABELS.deliveryStatus[d.status], dateTime(d.created_at)],
});
