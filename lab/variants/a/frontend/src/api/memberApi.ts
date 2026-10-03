import type { Member, MemberGrade, MemberStatus } from '../types/member';
import { api } from './client';

export const memberKeys = {
  all: ['members'] as const,
  detail: (id: number) => ['members', id] as const,
};

export function fetchMembers(): Promise<Member[]> {
  return api.get<Member[]>('/api/admin/members');
}

export function fetchMember(id: number): Promise<Member> {
  return api.get<Member>(`/api/admin/members/${id}`);
}

export function changeMemberStatus(
  id: number,
  status: Exclude<MemberStatus, 'WITHDRAWN'>,
): Promise<Member> {
  return api.patch<Member>(`/api/admin/members/${id}/status`, { status });
}

export function changeMemberGrade(id: number, grade: MemberGrade): Promise<Member> {
  return api.patch<Member>(`/api/admin/members/${id}/grade`, { grade });
}

export function withdrawMember(id: number): Promise<Member> {
  return api.post<Member>(`/api/admin/members/${id}/withdraw`);
}
