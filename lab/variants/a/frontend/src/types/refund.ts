export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';

export interface Refund {
  id: number;
  orderId: number;
  amount: number;
  partial: boolean;
  reason: string;
  status: RefundStatus;
  deliveryFeeDeduction: number | null;
  refundedAmount: number | null;
  requestedAt: string;
  processedAt: string | null;
}

export interface RefundCreateRequest {
  orderId: number | null;
  amount: number | null;
  reason: string;
}

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  REQUESTED: '요청',
  APPROVED: '승인',
  REJECTED: '거절',
};

export function refundKindLabel(partial: boolean): string {
  return partial ? '부분' : '전체';
}
