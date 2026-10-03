import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrderDetail } from '../../types/order';
import { cellsOf, definitionOf, headersOf, rowByFirstCell } from '../../test/helpers';
import { OrderDetailView } from './OrderDetailView';

const order: OrderDetail = {
  id: 1001,
  memberId: 4,
  status: 'PAID',
  productAmount: 327000,
  deliveryFee: 0,
  totalAmount: 327000,
  createdAt: '2026-01-15T10:00:00+09:00',
  paidAt: '2026-01-15T10:10:00+09:00',
  expiredAt: null,
  lines: [
    { productName: '27인치 모니터', unitPrice: 289000, quantity: 1, lineAmount: 289000 },
    { productName: '데스크 매트', unitPrice: 19000, quantity: 2, lineAmount: 38000 },
  ],
};

describe('OrderDetailView', () => {
  it('[ORD-14] 주문 정보와 상품 표를 표시한다', () => {
    render(<OrderDetailView order={order} isLoading={false} isError={false} onRetry={vi.fn()} />);

    expect(definitionOf('ID')).toBe('1001');
    expect(definitionOf('회원 ID')).toBe('4');
    expect(definitionOf('상태')).toBe('결제 완료');
    expect(definitionOf('상품 금액')).toBe('327,000원');
    expect(definitionOf('배송비')).toBe('0원');
    expect(definitionOf('결제 금액')).toBe('327,000원');
    expect(definitionOf('주문일시')).toBe('2026-01-15 10:00');
    expect(definitionOf('결제일시')).toBe('2026-01-15 10:10');
    expect(definitionOf('만료일시')).toBe('-');

    const table = screen.getByRole('table', { name: '상품' });
    expect(headersOf(table)).toEqual(['상품명', '단가', '수량', '금액']);
    expect(cellsOf(rowByFirstCell(table, '27인치 모니터'))).toEqual([
      '27인치 모니터',
      '289,000원',
      '1',
      '289,000원',
    ]);
    expect(cellsOf(rowByFirstCell(table, '데스크 매트'))).toEqual([
      '데스크 매트',
      '19,000원',
      '2',
      '38,000원',
    ]);
  });
});
