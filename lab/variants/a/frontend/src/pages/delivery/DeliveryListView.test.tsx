import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../types/delivery';
import { headersOf, rowByFirstCell } from '../../test/helpers';
import { DeliveryListView } from './DeliveryListView';

const deliveries: Delivery[] = [
  {
    id: 3,
    orderId: 103,
    status: 'READY',
    fee: 3000,
    createdAt: '2026-01-15T09:00:00+09:00',
    shippedAt: null,
    deliveredAt: null,
  },
  {
    id: 2,
    orderId: 102,
    status: 'SHIPPED',
    fee: 0,
    createdAt: '2026-01-14T09:00:00+09:00',
    shippedAt: '2026-01-14T15:00:00+09:00',
    deliveredAt: null,
  },
  {
    id: 1,
    orderId: 101,
    status: 'DELIVERED',
    fee: 3000,
    createdAt: '2026-01-13T09:00:00+09:00',
    shippedAt: '2026-01-13T15:00:00+09:00',
    deliveredAt: '2026-01-14T11:00:00+09:00',
  },
];

function renderView(canWrite: boolean) {
  return render(
    <DeliveryListView
      deliveries={deliveries}
      isLoading={false}
      isError={false}
      onRetry={vi.fn()}
      canWrite={canWrite}
      onChangeStatus={vi.fn()}
    />,
  );
}

describe('DeliveryListView', () => {
  it('[DLV-10] 출고 대기 배송에 출고 처리 버튼, 배송 중 배송에 도착 처리 버튼을 보여 주고 쓰기 권한이 없으면 버튼을 숨긴다', () => {
    const { unmount } = renderView(true);
    const table = screen.getByRole('table', { name: '배송 목록' });

    expect(headersOf(table).at(-1)).toBe('처리');
    const ready = rowByFirstCell(table, '3');
    expect(within(ready).getByText('출고 대기')).toBeInTheDocument();
    expect(
      within(ready)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['출고 처리']);
    const shipped = rowByFirstCell(table, '2');
    expect(
      within(shipped)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['도착 처리']);
    const delivered = rowByFirstCell(table, '1');
    expect(within(delivered).queryByRole('button')).not.toBeInTheDocument();
    unmount();

    renderView(false);
    const readOnly = screen.getByRole('table', { name: '배송 목록' });
    expect(within(readOnly).queryByRole('button')).not.toBeInTheDocument();
    expect(headersOf(readOnly)).not.toContain('처리');
  });
});
