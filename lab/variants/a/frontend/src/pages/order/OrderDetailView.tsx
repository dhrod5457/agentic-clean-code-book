import { DataTable, LoadState, type Column } from '../../components/DataTable';
import { DateTimeText } from '../../components/DateTimeText';
import { MoneyText } from '../../components/MoneyText';
import { StatusBadge } from '../../components/StatusBadge';
import { ORDER_STATUS_LABELS, type OrderDetail, type OrderLine } from '../../types/order';

const lineColumns: Column<OrderLine>[] = [
  { header: '상품명', cell: (line) => line.productName },
  { header: '단가', cell: (line) => <MoneyText value={line.unitPrice} /> },
  { header: '수량', cell: (line) => line.quantity },
  { header: '금액', cell: (line) => <MoneyText value={line.lineAmount} /> },
];

interface OrderDetailViewProps {
  order: OrderDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function OrderDetailView({ order, isLoading, isError, onRetry }: OrderDetailViewProps) {
  if (isError || isLoading || !order) {
    return <LoadState isError={isError} isLoading={isLoading || !order} onRetry={onRetry} />;
  }

  return (
    <>
      <dl className="detail-list">
        <dt>ID</dt>
        <dd>{order.id}</dd>
        <dt>회원 ID</dt>
        <dd>{order.memberId}</dd>
        <dt>상태</dt>
        <dd>
          <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
        </dd>
        <dt>상품 금액</dt>
        <dd>
          <MoneyText value={order.productAmount} />
        </dd>
        <dt>배송비</dt>
        <dd>
          <MoneyText value={order.deliveryFee} />
        </dd>
        <dt>결제 금액</dt>
        <dd>
          <MoneyText value={order.totalAmount} />
        </dd>
        <dt>주문일시</dt>
        <dd>
          <DateTimeText value={order.createdAt} />
        </dd>
        <dt>결제일시</dt>
        <dd>
          <DateTimeText value={order.paidAt} />
        </dd>
        <dt>만료일시</dt>
        <dd>
          <DateTimeText value={order.expiredAt} />
        </dd>
      </dl>
      <h2>상품</h2>
      <DataTable
        label="상품"
        columns={lineColumns}
        rows={order.lines}
        rowKey={(line) => lineKey(order.lines, line)}
      />
    </>
  );
}

function lineKey(lines: OrderLine[], line: OrderLine): number {
  return lines.indexOf(line);
}
