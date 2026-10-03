import type { Refund, RefundCreateRequest } from '../types/refund';
import { api } from './client';

export const refundKeys = {
  all: ['refunds'] as const,
};

export function fetchRefunds(): Promise<Refund[]> {
  return api.get<Refund[]>('/api/admin/refunds');
}

export function requestRefund(body: RefundCreateRequest): Promise<Refund> {
  return api.post<Refund>('/api/admin/refunds', body);
}

export function approveRefund(id: number): Promise<Refund> {
  return api.post<Refund>(`/api/admin/refunds/${id}/approve`);
}

export function rejectRefund(id: number): Promise<Refund> {
  return api.post<Refund>(`/api/admin/refunds/${id}/reject`);
}
