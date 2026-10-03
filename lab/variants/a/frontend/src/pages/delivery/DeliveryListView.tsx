import { DataTable, type Column } from '../../components/DataTable';
import { DateTimeText } from '../../components/DateTimeText';
import { MoneyText } from '../../components/MoneyText';
import { StatusBadge } from '../../components/StatusBadge';
import { DELIVERY_STATUS_LABELS, type Delivery, type DeliveryStatus } from '../../types/delivery';

const columns: Column<Delivery>[] = [
  { header: 'ID', cell: (delivery) => delivery.id },
  { header: '주문 ID', cell: (delivery) => delivery.orderId },
  {
    header: '상태',
    cell: (delivery) => (
      <StatusBadge status={delivery.status} label={DELIVERY_STATUS_LABELS[delivery.status]} />
    ),
  },
  { header: '배송비', cell: (delivery) => <MoneyText value={delivery.fee} /> },
  { header: '등록일시', cell: (delivery) => <DateTimeText value={delivery.createdAt} /> },
  { header: '출고일시', cell: (delivery) => <DateTimeText value={delivery.shippedAt} /> },
  { header: '도착일시', cell: (delivery) => <DateTimeText value={delivery.deliveredAt} /> },
];

/** 현재 상태에서 할 수 있는 다음 상태와 버튼 이름 */
const NEXT_ACTIONS: Partial<Record<DeliveryStatus, { next: DeliveryStatus; label: string }>> = {
  READY: { next: 'SHIPPED', label: '출고 처리' },
  SHIPPED: { next: 'DELIVERED', label: '도착 처리' },
};

interface DeliveryListViewProps {
  deliveries: Delivery[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canWrite: boolean;
  alertMessage?: string | null;
  isSubmitting?: boolean;
  onChangeStatus: (id: number, status: DeliveryStatus) => void;
}

export function DeliveryListView({
  deliveries,
  isLoading,
  isError,
  onRetry,
  canWrite,
  alertMessage,
  isSubmitting = false,
  onChangeStatus,
}: DeliveryListViewProps) {
  return (
    <>
      {alertMessage && (
        <p role="alert" className="notice notice-error">
          {alertMessage}
        </p>
      )}
      <DataTable
        label="배송 목록"
        columns={columns}
        rows={deliveries}
        rowKey={(delivery) => delivery.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        renderActions={
          canWrite
            ? (delivery) => {
                const action = NEXT_ACTIONS[delivery.status];
                return action ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => onChangeStatus(delivery.id, action.next)}
                  >
                    {action.label}
                  </button>
                ) : null;
              }
            : undefined
        }
      />
    </>
  );
}
