import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS, type Permission } from '../types/permission';
import { Sidebar } from './Sidebar';

function menuOf(permissions: readonly Permission[], path = '/members') {
  const { unmount } = render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar permissions={permissions} />
    </MemoryRouter>,
  );
  const nav = screen.getByRole('navigation', { name: '주메뉴' });
  const groups = within(nav)
    .getAllByRole('heading', { level: 2 })
    .map((heading) => ({
      group: heading.textContent,
      items: within(heading.nextElementSibling as HTMLElement)
        .getAllByRole('link')
        .map((link) => link.textContent),
    }));
  const current = within(nav)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent);
  unmount();
  return { groups, current };
}

describe('Sidebar', () => {
  it('[AUT-10] 권한이 있는 메뉴 항목만 그룹 순서와 항목 순서로 표시한다', () => {
    const all = menuOf(PERMISSIONS, '/deliveries');
    expect(all.groups).toEqual([
      { group: '회원', items: ['회원 목록'] },
      { group: '주문', items: ['주문 목록'] },
      { group: '배송', items: ['배송 목록', '배송 정책'] },
      { group: '환불', items: ['환불 목록'] },
      { group: '설정', items: ['관리자 계정'] },
    ]);
    expect(all.current).toEqual(['배송 목록']);

    const limited = menuOf(['MEMBER_READ', 'DELIVERY_READ', 'DELIVERY_WRITE', 'STAFF_WRITE']);
    expect(limited.groups).toEqual([
      { group: '회원', items: ['회원 목록'] },
      { group: '배송', items: ['배송 목록', '배송 정책'] },
    ]);
    expect(limited.current).toEqual(['회원 목록']);
  });
});
