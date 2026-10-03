import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Member } from '../../types/member';
import { cellsOf, headersOf, rowByFirstCell } from '../../test/helpers';
import { MemberListView } from './MemberListView';

const members: Member[] = [
  {
    id: 1,
    name: '윤지우',
    email: 'member01@example.com',
    grade: 'GENERAL',
    status: 'ACTIVE',
    joinedAt: '2024-10-15T09:00:00+09:00',
    lastLoginAt: '2026-01-07T09:00:00+09:00',
    withdrawnAt: null,
  },
  {
    id: 7,
    name: '임서윤',
    email: 'member07@example.com',
    grade: 'VIP',
    status: 'SUSPENDED',
    joinedAt: '2024-03-07T03:00:00+09:00',
    lastLoginAt: null,
    withdrawnAt: null,
  },
  {
    id: 13,
    name: '서승민',
    email: 'member13@example.com',
    grade: 'GENERAL',
    status: 'WITHDRAWN',
    joinedAt: '2023-07-29T09:00:00+09:00',
    lastLoginAt: '2026-01-02T07:00:00+09:00',
    withdrawnAt: '2026-01-05T07:00:00+09:00',
  },
];

describe('MemberListView', () => {
  it('[MBR-09] 회원 목록의 열과 등급, 상태 이름을 표시한다', () => {
    render(
      <MemoryRouter>
        <MemberListView members={members} isLoading={false} isError={false} onRetry={vi.fn()} />
      </MemoryRouter>,
    );

    const table = screen.getByRole('table', { name: '회원 목록' });
    expect(headersOf(table)).toEqual([
      'ID',
      '이름',
      '이메일',
      '등급',
      '상태',
      '가입일시',
      '마지막 로그인',
    ]);
    expect(cellsOf(rowByFirstCell(table, '1'))).toEqual([
      '1',
      '윤지우',
      'member01@example.com',
      '일반',
      '활성',
      '2024-10-15 09:00',
      '2026-01-07 09:00',
    ]);
    expect(cellsOf(rowByFirstCell(table, '7'))).toEqual([
      '7',
      '임서윤',
      'member07@example.com',
      'VIP',
      '정지',
      '2024-03-07 03:00',
      '-',
    ]);
    expect(cellsOf(rowByFirstCell(table, '13')).slice(3, 5)).toEqual(['일반', '탈퇴']);
    expect(screen.getByRole('link', { name: '윤지우' })).toHaveAttribute('href', '/members/1');
  });
});
