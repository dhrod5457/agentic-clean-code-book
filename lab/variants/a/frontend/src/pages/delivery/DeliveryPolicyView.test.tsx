import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { definitionOf } from '../../test/helpers';
import { DeliveryPolicyView } from './DeliveryPolicyView';

describe('DeliveryPolicyView', () => {
  it('[DLV-11] 기본 배송비 3,000원과 VIP 무료배송 기준 금액 150,000원을 표시한다', () => {
    render(
      <DeliveryPolicyView
        policy={{ baseFee: 3000, vipFreeShippingThreshold: 150000 }}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(definitionOf('기본 배송비')).toBe('3,000원');
    expect(definitionOf('VIP 무료배송 기준 금액')).toBe('150,000원');
    expect(
      screen.getByText('VIP 회원의 상품 금액이 기준 금액 이상이면 배송비가 0원입니다.'),
    ).toBeInTheDocument();
  });
});
