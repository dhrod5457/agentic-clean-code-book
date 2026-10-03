import { useId, useState, type FormEvent } from 'react';
import { DataTable, type Column } from '../../components/DataTable';
import { DateTimeText } from '../../components/DateTimeText';
import { MoneyText } from '../../components/MoneyText';
import { StatusBadge } from '../../components/StatusBadge';
import {
  REFUND_STATUS_LABELS,
  refundKindLabel,
  type Refund,
  type RefundCreateRequest,
} from '../../types/refund';

const columns: Column<Refund>[] = [
  { header: 'ID', cell: (refund) => refund.id },
  { header: '주문 ID', cell: (refund) => refund.orderId },
  { header: '구분', cell: (refund) => refundKindLabel(refund.partial) },
  { header: '요청 금액', cell: (refund) => <MoneyText value={refund.amount} /> },
  { header: '배송비 차감', cell: (refund) => <MoneyText value={refund.deliveryFeeDeduction} /> },
  { header: '환불 금액', cell: (refund) => <MoneyText value={refund.refundedAmount} /> },
  {
    header: '상태',
    cell: (refund) => (
      <StatusBadge status={refund.status} label={REFUND_STATUS_LABELS[refund.status]} />
    ),
  },
  { header: '요청일시', cell: (refund) => <DateTimeText value={refund.requestedAt} /> },
  { header: '처리일시', cell: (refund) => <DateTimeText value={refund.processedAt} /> },
];

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

interface RefundRequestFormProps {
  isSubmitting: boolean;
  onSubmit: (request: RefundCreateRequest) => void;
  onCancel: () => void;
}

function RefundRequestForm({ isSubmitting, onSubmit, onCancel }: RefundRequestFormProps) {
  const id = useId();
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ orderId: toNumberOrNull(orderId), amount: toNumberOrNull(amount), reason });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor={`${id}-order`}>주문 ID</label>
        <input
          id={`${id}-order`}
          type="number"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-amount`}>요청 금액</label>
        <input
          id={`${id}-amount`}
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-reason`}>사유</label>
        <input
          id={`${id}-reason`}
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          등록
        </button>
        <button type="button" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  );
}

interface RefundListViewProps {
  refunds: Refund[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canWrite: boolean;
  alertMessage?: string | null;
  isSubmitting?: boolean;
  isFormOpen: boolean;
  onOpenForm: () => void;
  onCloseForm: () => void;
  onRequest: (request: RefundCreateRequest) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export function RefundListView({
  refunds,
  isLoading,
  isError,
  onRetry,
  canWrite,
  alertMessage,
  isSubmitting = false,
  isFormOpen,
  onOpenForm,
  onCloseForm,
  onRequest,
  onApprove,
  onReject,
}: RefundListViewProps) {
  return (
    <>
      {alertMessage && (
        <p role="alert" className="notice notice-error">
          {alertMessage}
        </p>
      )}
      {canWrite && !isFormOpen && (
        <div className="toolbar">
          <button type="button" onClick={onOpenForm}>
            환불 요청 등록
          </button>
        </div>
      )}
      {canWrite && isFormOpen && (
        <RefundRequestForm
          isSubmitting={isSubmitting}
          onSubmit={onRequest}
          onCancel={onCloseForm}
        />
      )}
      <DataTable
        label="환불 목록"
        columns={columns}
        rows={refunds}
        rowKey={(refund) => refund.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        renderActions={
          canWrite
            ? (refund) =>
                refund.status === 'REQUESTED' ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onApprove(refund.id)}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onReject(refund.id)}
                    >
                      거절
                    </button>
                  </>
                ) : null
            : undefined
        }
      />
    </>
  );
}
