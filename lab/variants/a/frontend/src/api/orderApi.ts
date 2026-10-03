import type { ExpireOverdueResult, OrderDetail, OrderSummary } from '../types/order';
import { api } from './client';

export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: number) => ['orders', id] as const,
};

export function fetchOrders(): Promise<OrderSummary[]> {
  return api.get<OrderSummary[]>('/api/admin/orders');
}

export function fetchOrder(id: number): Promise<OrderDetail> {
  return api.get<OrderDetail>(`/api/admin/orders/${id}`);
}

export function expireOverdueOrders(): Promise<ExpireOverdueResult> {
  return api.post<ExpireOverdueResult>('/api/admin/orders/expire-overdue');
}
