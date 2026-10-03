export const PERMISSIONS = [
  'MEMBER_READ',
  'MEMBER_WRITE',
  'ORDER_READ',
  'ORDER_WRITE',
  'DELIVERY_READ',
  'DELIVERY_WRITE',
  'REFUND_READ',
  'REFUND_WRITE',
  'STAFF_READ',
  'STAFF_WRITE',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function hasPermission(
  permissions: readonly Permission[] | undefined,
  permission: Permission | undefined,
): boolean {
  if (!permission) {
    return false;
  }
  return permissions?.includes(permission) ?? false;
}
