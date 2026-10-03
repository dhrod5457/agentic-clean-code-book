import type { Permission } from './permission';

export type Role = 'ADMIN' | 'OPERATOR';

export const ROLES: readonly Role[] = ['ADMIN', 'OPERATOR'];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: '관리자',
  OPERATOR: '운영자',
};

export interface Staff {
  id: number;
  loginId: string;
  name: string;
  department: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface StaffCreateRequest {
  loginId: string;
  name: string;
  department: string;
  role: Role;
  password: string;
}

export interface SessionUser {
  id: number;
  loginId: string;
  name: string;
  role: Role;
  permissions: Permission[];
}

export interface LoginRequest {
  loginId: string;
  password: string;
}

export function staffActiveLabel(active: boolean): string {
  return active ? '활성' : '비활성';
}
