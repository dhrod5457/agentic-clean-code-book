type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  WITHDRAWN: 'neutral',
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  EXPIRED: 'neutral',
  READY: 'warning',
  SHIPPED: 'info',
  DELIVERED: 'success',
  REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  INACTIVE: 'neutral',
};

interface StatusBadgeProps {
  /** enum 값. 색을 정하는 데 쓴다 */
  status: string;
  /** 표시 이름 */
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const tone = STATUS_TONES[status] ?? 'neutral';
  return <span className={`status-badge status-badge-${tone}`}>{label}</span>;
}
