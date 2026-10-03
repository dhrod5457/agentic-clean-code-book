import { Outlet } from 'react-router';
import { ROLE_LABELS, type SessionUser } from '../types/staff';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  user: SessionUser;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

export function Layout({ user, onLogout, isLoggingOut = false }: LayoutProps) {
  return (
    <div className="layout">
      <header className="layout-header">
        <span className="layout-brand">쇼핑몰 관리자</span>
        <div className="layout-user">
          <span>
            {user.name} ({ROLE_LABELS[user.role]})
          </span>
          <button type="button" onClick={onLogout} disabled={isLoggingOut}>
            로그아웃
          </button>
        </div>
      </header>
      <div className="layout-body">
        <Sidebar permissions={user.permissions} />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
