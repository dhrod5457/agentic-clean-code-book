import type { ComponentType } from 'react';
import { DeliveryListPage } from '../pages/delivery/DeliveryListPage';
import { DeliveryPolicyPage } from '../pages/delivery/DeliveryPolicyPage';
import { MemberDetailPage } from '../pages/member/MemberDetailPage';
import { MemberListPage } from '../pages/member/MemberListPage';
import { OrderDetailPage } from '../pages/order/OrderDetailPage';
import { OrderListPage } from '../pages/order/OrderListPage';
import { RefundListPage } from '../pages/refund/RefundListPage';
import { StaffListPage } from '../pages/staff/StaffListPage';
import type { Permission } from '../types/permission';

/** 메뉴 그룹. 이 배열의 순서가 메뉴 표시 순서다. */
export const MENU_GROUPS = ['회원', '주문', '배송', '환불', '설정'] as const;
export type MenuGroup = (typeof MENU_GROUPS)[number];

/** 화면 component 가 받는 값 */
export interface ScreenProps {
  /** 그 화면의 쓰기 권한이 있는지 */
  canWrite: boolean;
}

export interface AdminRoute {
  path: string;
  /** 화면 제목(h1) */
  title: string;
  /** 메뉴 항목 이름. 없으면 title */
  menuLabel?: string;
  group: MenuGroup;
  /** 화면을 보는 데 필요한 권한 */
  readPermission: Permission;
  /** 화면의 쓰기 동작에 필요한 권한 */
  writePermission?: Permission;
  inMenu: boolean;
  component: ComponentType<ScreenProps>;
}

/** route · 메뉴 · 화면 권한 표 */
export const adminRoutes: readonly AdminRoute[] = [
  {
    path: '/members',
    title: '회원 목록',
    group: '회원',
    readPermission: 'MEMBER_READ',
    writePermission: 'MEMBER_WRITE',
    inMenu: true,
    component: MemberListPage,
  },
  {
    path: '/members/:id',
    title: '회원 상세',
    group: '회원',
    readPermission: 'MEMBER_READ',
    writePermission: 'MEMBER_WRITE',
    inMenu: false,
    component: MemberDetailPage,
  },
  {
    path: '/orders',
    title: '주문 목록',
    group: '주문',
    readPermission: 'ORDER_READ',
    writePermission: 'ORDER_WRITE',
    inMenu: true,
    component: OrderListPage,
  },
  {
    path: '/orders/:id',
    title: '주문 상세',
    group: '주문',
    readPermission: 'ORDER_READ',
    inMenu: false,
    component: OrderDetailPage,
  },
  {
    path: '/deliveries',
    title: '배송 목록',
    group: '배송',
    readPermission: 'DELIVERY_READ',
    writePermission: 'DELIVERY_WRITE',
    inMenu: true,
    component: DeliveryListPage,
  },
  {
    path: '/delivery-policy',
    title: '배송 정책',
    group: '배송',
    readPermission: 'DELIVERY_READ',
    inMenu: true,
    component: DeliveryPolicyPage,
  },
  {
    path: '/refunds',
    title: '환불 목록',
    group: '환불',
    readPermission: 'REFUND_READ',
    writePermission: 'REFUND_WRITE',
    inMenu: true,
    component: RefundListPage,
  },
  {
    path: '/staff',
    title: '관리자 계정 목록',
    menuLabel: '관리자 계정',
    group: '설정',
    readPermission: 'STAFF_READ',
    writePermission: 'STAFF_WRITE',
    inMenu: true,
    component: StaffListPage,
  },
];

export interface MenuItem {
  path: string;
  label: string;
}

export interface MenuSection {
  group: MenuGroup;
  items: MenuItem[];
}

/** 권한이 있는 메뉴 항목만 그룹 순서, 그룹 안 가나다순으로 돌려준다. 빈 그룹은 뺀다. */
export function buildMenu(
  permissions: readonly Permission[],
  routes: readonly AdminRoute[] = adminRoutes,
): MenuSection[] {
  return MENU_GROUPS.map((group) => ({
    group,
    items: routes
      .filter(
        (route) =>
          route.inMenu && route.group === group && permissions.includes(route.readPermission),
      )
      .map((route) => ({ path: route.path, label: route.menuLabel ?? route.title }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ko')),
  })).filter((section) => section.items.length > 0);
}
