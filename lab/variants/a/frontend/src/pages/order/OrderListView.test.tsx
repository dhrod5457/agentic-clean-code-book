import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { OrderSummary } from '../../types/order';
import { cellsOf, headersOf, rowByFirstCell } from '../../test/helpers';
import { OrderListView } from './OrderListView';

const orders: OrderSummary[] = [
  {
    id: 1002,
    memberId: 4,
    status: 'PAID',
    productAmount: 308000,
    deliveryFee: 0,
    totalAmount: 308000,
    createdAt: '2026-01-15T01:00:00Z',
    paidAt: '2026-01-15T10:05:00+09:00',
    expiredAt: null,
  },
  {
    id: 1001,
    memberId: 1,
    status: 'PENDING_PAYMENT',
    productAmount: 19000,
    deliveryFee: 3000,
    totalAmount: 22000,
    createdAt: '2026-01-15T09:50:00+09:00',
    paidAt: null,
    expiredAt: null,
  },
  {
    id: 1000,
    memberId: 2,
    status: 'EXPIRED',
    productAmount: 1500000,
    deliveryFee: 3000,
    totalAmount: 1503000,
    createdAt: '2026-01-14T23:30:00+09:00',
    paidAt: null,
    expiredAt: '2026-01-15T00:00:00+09:00',
  },
];

describe('OrderListView', () => {
  it('[ORD-13] 주문 목록의 열, 상태 이름, 금액 형식을 표시한다', () => {
    render(
      <MemoryRouter>
        <OrderListView
          orders={orders}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          canWrite={true}
          onExpireOverdue={vi.fn()}
        />
      </MemoryRouter>,
    );

    const table = screen.getByRole('table', { name: '주문 목록' });
    expect(headersOf(table)).toEqual([
      'ID',
      '회원 ID',
      '상태',
      '상품 금액',
      '배송비',
      '결제 금액',
      '주문일시',
      '결제일시',
    ]);
    expect(cellsOf(rowByFirstCell(table, '1002'))).toEqual([
      '1002',
      '4',
      '결제 완료',
      '308,000원',
      '0원',
      '308,000원',
      '2026-01-15 10:00',
      '2026-01-15 10:05',
    ]);
    expect(cellsOf(rowByFirstCell(table, '1001'))).toEqual([
      '1001',
      '1',
      '결제 대기',
      '19,000원',
      '3,000원',
      '22,000원',
      '2026-01-15 09:50',
      '-',
    ]);
    expect(cellsOf(rowByFirstCell(table, '1000'))).toEqual([
      '1000',
      '2',
      '만료',
      '1,500,000원',
      '3,000원',
      '1,503,000원',
      '2026-01-14 23:30',
      '-',
    ]);
    expect(screen.getByRole('link', { name: '1002' })).toHaveAttribute('href', '/orders/1002');
    expect(screen.getByRole('button', { name: '만료 처리' })).toBeInTheDocument();
  });
});
