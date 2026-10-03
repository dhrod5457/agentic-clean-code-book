import type { Delivery, DeliveryPolicy, DeliveryStatus } from '../types/delivery';
import { api } from './client';

export const deliveryKeys = {
  all: ['deliveries'] as const,
  policy: ['delivery-policy'] as const,
};

export function fetchDeliveries(): Promise<Delivery[]> {
  return api.get<Delivery[]>('/api/admin/deliveries');
}

export function changeDeliveryStatus(id: number, status: DeliveryStatus): Promise<Delivery> {
  return api.patch<Delivery>(`/api/admin/deliveries/${id}/status`, { status });
}

export function fetchDeliveryPolicy(): Promise<DeliveryPolicy> {
  return api.get<DeliveryPolicy>('/api/admin/delivery-policy');
}
