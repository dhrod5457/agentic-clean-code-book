export type DeliveryStatus = 'READY' | 'SHIPPED' | 'DELIVERED';

export interface Delivery {
  id: number;
  orderId: number;
  status: DeliveryStatus;
  fee: number;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface DeliveryPolicy {
  baseFee: number;
  vipFreeShippingThreshold: number;
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  READY: '출고 대기',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
};
