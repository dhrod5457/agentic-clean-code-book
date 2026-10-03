import type { LoginRequest, Role, SessionUser, Staff, StaffCreateRequest } from '../types/staff';
import { api, isApiError } from './client';

export const staffKeys = {
  all: ['staff'] as const,
  session: ['session'] as const,
};

export function login(body: LoginRequest): Promise<SessionUser> {
  return api.post<SessionUser>('/api/auth/login', body);
}

export function logout(): Promise<void> {
  return api.post<void>('/api/auth/logout');
}

/** 현재 사용자. 로그인하지 않았으면(401) null. */
export async function fetchCurrentUser(): Promise<SessionUser | null> {
  try {
    return await api.get<SessionUser>('/api/auth/me');
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function fetchStaff(): Promise<Staff[]> {
  return api.get<Staff[]>('/api/admin/staff');
}

export function createStaff(body: StaffCreateRequest): Promise<Staff> {
  return api.post<Staff>('/api/admin/staff', body);
}

export function changeStaffRole(id: number, role: Role): Promise<Staff> {
  return api.patch<Staff>(`/api/admin/staff/${id}/role`, { role });
}

export function deactivateStaff(id: number): Promise<Staff> {
  return api.post<Staff>(`/api/admin/staff/${id}/deactivate`);
}
