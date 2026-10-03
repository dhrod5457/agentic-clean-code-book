import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Member } from '../../types/member';
import { MemberDetailView } from './MemberDetailView';

const activeGeneral: Member = {
  id: 1,
  name: '윤지우',
  email: 'member01@example.com',
  grade: 'GENERAL',
  status: 'ACTIVE',
  joinedAt: '2024-10-15T09:00:00+09:00',
  lastLoginAt: '2026-01-07T09:00:00+09:00',
  withdrawnAt: null,
};
const suspendedVip: Member = { ...activeGeneral, id: 7, grade: 'VIP', status: 'SUSPENDED' };
const withdrawn: Member = {
  ...activeGeneral,
  id: 13,
  status: 'WITHDRAWN',
  withdrawnAt: '2026-01-05T07:00:00+09:00',
};

function buttonNames(member: Member, canWrite: boolean): string[] {
  const { unmount } = render(
    <MemberDetailView
      member={member}
      isLoading={false}
      isError={false}
      onRetry={vi.fn()}
      canWrite={canWrite}
      onAction={vi.fn()}
    />,
  );
  const names = screen.queryAllByRole('button').map((button) => button.textContent ?? '');
  unmount();
  return names;
}

describe('MemberDetailView', () => {
  it('[MBR-10] 회원 상태와 등급에 맞는 쓰기 버튼을 보여 주고 쓰기 권한이 없거나 탈퇴 회원이면 숨긴다', () => {
    expect(buttonNames(activeGeneral, true)).toEqual(['정지', 'VIP로 변경', '탈퇴 처리']);
    expect(buttonNames(suspendedVip, true)).toEqual(['정지 해제', '일반으로 변경', '탈퇴 처리']);
    expect(buttonNames(withdrawn, true)).toEqual([]);
    expect(buttonNames(activeGeneral, false)).toEqual([]);
    expect(buttonNames(suspendedVip, false)).toEqual([]);
  });
});
