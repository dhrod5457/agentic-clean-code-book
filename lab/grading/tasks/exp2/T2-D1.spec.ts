import { DELIVERY_KEYS } from '../../support/api';
import { DAY, T0_MS, ms, seed } from '../../support/seed';
import { dateTime, won } from '../../support/ui';
import { defineListTask } from './list-task';

defineListTask({
  id: 'T2-D1', title: '배송 지연', path: '/deliveries/delayed', group: '배송',
  api: '/api/admin/deliveries/delayed', sourceApi: '/api/admin/deliveries', keys: DELIVERY_KEYS,
  expected: seed.deliveries
    .filter((d) => d.status === 'SHIPPED' && d.shipped_at !== null && ms(d.shipped_at) < T0_MS - 3 * DAY)
    .sort((a, b) => ms(a.shipped_at!) - ms(b.shipped_at!) || a.id - b.id),
  columns: ['ID', '주문 ID', '배송비', '출고일시'],
  firstRowCells: (d) => [String(d.id), String(d.order_id), won(d.fee), dateTime(d.shipped_at)],
});
