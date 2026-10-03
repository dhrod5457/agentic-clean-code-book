import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Refund } from '../../types/refund';
import { cellsOf, headersOf, rowByFirstCell } from '../../test/helpers';
import { RefundListView } from './RefundListView';

const refunds: Refund[] = [
  {
    id: 3,
    orderId: 103,
    amount: 20000,
    partial: true,
    reason: '단순 변심',
    status: 'REQUESTED',
    deliveryFeeDeduction: null,
    refundedAmount: null,
    requestedAt: '2026-01-15T09:00:00+09:00',
    processedAt: null,
  },
  {
    id: 2,
    orderId: 102,
    amount: 20000,
    partial: true,
    reason: '단순 변심',
    status: 'APPROVED',
    deliveryFeeDeduction: 3000,
    refundedAmount: 17000,
    requestedAt: '2026-01-14T09:00:00+09:00',
    processedAt: '2026-01-14T10:00:00+09:00',
  },
  {
    id: 1,
    orderId: 101,
    amount: 50000,
    partial: false,
    reason: '상품 불량',
    status: 'REJECTED',
    deliveryFeeDeduction: null,
    refundedAmount: null,
    requestedAt: '2026-01-13T09:00:00+09:00',
    processedAt: '2026-01-13T10:00:00+09:00',
  },
];

function renderView(canWrite: boolean) {
  return render(
    <RefundListView
      refunds={refunds}
      isLoading={false}
      isError={false}
      onRetry={vi.fn()}
      canWrite={canWrite}
      isFormOpen={false}
      onOpenForm={vi.fn()}
      onCloseForm={vi.fn()}
      onRequest={vi.fn()}
      onApprove={vi.fn()}
      onReject={vi.fn()}
    />,
  );
}

describe('RefundListView', () => {
  it('[RFD-15] 요청 상태 환불에만 승인, 거절 버튼을 보여 주고 쓰기 권한이 없으면 버튼과 환불 요청 등록을 숨긴다', () => {
    const { unmount } = renderView(true);
    const table = screen.getByRole('table', { name: '환불 목록' });

    expect(headersOf(table)).toEqual([
      'ID',
      '주문 ID',
      '구분',
      '요청 금액',
      '배송비 차감',
      '환불 금액',
      '상태',
      '요청일시',
      '처리일시',
      '처리',
    ]);
    const requested = rowByFirstCell(table, '3');
    expect(
      within(requested)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['승인', '거절']);
    const approved = rowByFirstCell(table, '2');
    expect(cellsOf(approved).slice(0, 7)).toEqual([
      '2',
      '102',
      '부분',
      '20,000원',
      '3,000원',
      '17,000원',
      '승인',
    ]);
    expect(within(approved).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rowByFirstCell(table, '1')).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '환불 요청 등록' })).toBeInTheDocument();
    unmount();

    renderView(false);
    const readOnly = screen.getByRole('table', { name: '환불 목록' });
    expect(headersOf(readOnly)).not.toContain('처리');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
