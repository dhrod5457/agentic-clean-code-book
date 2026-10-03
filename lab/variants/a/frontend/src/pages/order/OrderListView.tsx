import { Link } from 'react-router';
import { DataTable, type Column } from '../../components/DataTable';
import { DateTimeText } from '../../components/DateTimeText';
import { MoneyText } from '../../components/MoneyText';
import { StatusBadge } from '../../components/StatusBadge';
import { ORDER_STATUS_LABELS, type OrderSummary } from '../../types/order';

const columns: Column<OrderSummary>[] = [
  { header: 'ID', cell: (order) => <Link to={`/orders/${order.id}`}>{order.id}</Link> },
  { header: '회원 ID', cell: (order) => order.memberId },
  {
    header: '상태',
    cell: (order) => (
      <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
    ),
  },
  { header: '상품 금액', cell: (order) => <MoneyText value={order.productAmount} /> },
  { header: '배송비', cell: (order) => <MoneyText value={order.deliveryFee} /> },
  { header: '결제 금액', cell: (order) => <MoneyText value={order.totalAmount} /> },
  { header: '주문일시', cell: (order) => <DateTimeText value={order.createdAt} /> },
  { header: '결제일시', cell: (order) => <DateTimeText value={order.paidAt} /> },
];

interface OrderListViewProps {
  orders: OrderSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canWrite: boolean;
  alertMessage?: string | null;
  statusMessage?: string | null;
  isExpiring?: boolean;
  onExpireOverdue: () => void;
}

export function OrderListView({
  orders,
  isLoading,
  isError,
  onRetry,
  canWrite,
  alertMessage,
  statusMessage,
  isExpiring = false,
  onExpireOverdue,
}: OrderListViewProps) {
  return (
    <>
      {alertMessage && (
        <p role="alert" className="notice notice-error">
          {alertMessage}
        </p>
      )}
      {statusMessage && (
        <p role="status" className="notice notice-success">
          {statusMessage}
        </p>
      )}
      {canWrite && (
        <div className="toolbar">
          <button type="button" disabled={isExpiring} onClick={onExpireOverdue}>
            만료 처리
          </button>
        </div>
      )}
      <DataTable
        label="주문 목록"
        columns={columns}
        rows={orders}
        rowKey={(order) => order.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
      />
    </>
  );
}
