import type { ReactNode } from 'react';
import { useSession } from '../hooks/useSession';
import { hasPermission, type Permission } from '../types/permission';

interface RequirePermissionProps {
  title: string;
  permission: Permission;
  children: ReactNode;
}

/** 화면 제목을 표시하고, 화면 권한이 없으면 본문 대신 "권한이 없습니다." 를 표시한다. */
export function RequirePermission({ title, permission, children }: RequirePermissionProps) {
  const { data: user } = useSession();
  return (
    <>
      <h1>{title}</h1>
      {hasPermission(user?.permissions, permission) ? children : <p>권한이 없습니다.</p>}
    </>
  );
}
