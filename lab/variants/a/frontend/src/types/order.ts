export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED';

export interface OrderSummary {
  id: number;
  memberId: number;
  status: OrderStatus;
  productAmount: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
  expiredAt: string | null;
}

export interface OrderLine {
  productName: string;
  unitPrice: number;
  quantity: number;
  lineAmount: number;
}

export interface OrderDetail extends OrderSummary {
  lines: OrderLine[];
}

export interface ExpireOverdueResult {
  expiredCount: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '결제 대기',
  PAID: '결제 완료',
  EXPIRED: '만료',
};
