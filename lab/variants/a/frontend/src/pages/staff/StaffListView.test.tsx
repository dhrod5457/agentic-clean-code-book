import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Staff } from '../../types/staff';
import { cellsOf, headersOf, rowByFirstCell } from '../../test/helpers';
import { StaffListView } from './StaffListView';

const staff: Staff[] = [
  {
    id: 1,
    loginId: 'admin',
    name: '김지훈',
    department: '운영팀',
    role: 'ADMIN',
    active: true,
    createdAt: '2024-10-02T10:00:00+09:00',
  },
  {
    id: 12,
    loginId: 'oh.log',
    name: '오민석',
    department: '물류팀',
    role: 'OPERATOR',
    active: false,
    createdAt: '2025-08-28T10:00:00+09:00',
  },
];

function renderView(canWrite: boolean) {
  return render(
    <StaffListView
      staff={staff}
      isLoading={false}
      isError={false}
      onRetry={vi.fn()}
      canWrite={canWrite}
      isCreateFormOpen={false}
      onOpenCreateForm={vi.fn()}
      onCloseCreateForm={vi.fn()}
      onCreate={vi.fn()}
      editingId={null}
      onEdit={vi.fn()}
      onCancelEdit={vi.fn()}
      onSaveRole={vi.fn()}
      onDeactivate={vi.fn()}
    />,
  );
}

describe('StaffListView', () => {
  it('[STF-07] 관리자 계정 목록의 열과 활성 계정의 수정, 비활성화 버튼을 보여 주고 쓰기 권한이 없으면 버튼과 관리자 계정 추가를 숨긴다', () => {
    const { unmount } = renderView(true);
    const table = screen.getByRole('table', { name: '관리자 계정 목록' });

    expect(headersOf(table)).toEqual(['로그인 ID', '이름', '부서', '역할', '상태', '처리']);
    const active = rowByFirstCell(table, 'admin');
    expect(cellsOf(active).slice(0, 5)).toEqual(['admin', '김지훈', '운영팀', '관리자', '활성']);
    expect(
      within(active)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['수정', '비활성화']);
    const inactive = rowByFirstCell(table, 'oh.log');
    expect(cellsOf(inactive).slice(0, 5)).toEqual([
      'oh.log',
      '오민석',
      '물류팀',
      '운영자',
      '비활성',
    ]);
    expect(within(inactive).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '관리자 계정 추가' })).toBeInTheDocument();
    unmount();

    renderView(false);
    const readOnly = screen.getByRole('table', { name: '관리자 계정 목록' });
    expect(headersOf(readOnly)).toEqual(['로그인 ID', '이름', '부서', '역할', '상태']);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
