export type MemberGrade = 'GENERAL' | 'VIP';
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

export interface Member {
  id: number;
  name: string;
  email: string;
  grade: MemberGrade;
  status: MemberStatus;
  joinedAt: string;
  lastLoginAt: string | null;
  withdrawnAt: string | null;
}

export const MEMBER_GRADE_LABELS: Record<MemberGrade, string> = {
  GENERAL: '일반',
  VIP: 'VIP',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: '활성',
  SUSPENDED: '정지',
  WITHDRAWN: '탈퇴',
};
