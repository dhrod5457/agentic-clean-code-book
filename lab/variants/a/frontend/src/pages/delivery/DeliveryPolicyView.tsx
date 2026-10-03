import { LoadState } from '../../components/DataTable';
import { MoneyText } from '../../components/MoneyText';
import type { DeliveryPolicy } from '../../types/delivery';

interface DeliveryPolicyViewProps {
  policy: DeliveryPolicy | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function DeliveryPolicyView({
  policy,
  isLoading,
  isError,
  onRetry,
}: DeliveryPolicyViewProps) {
  if (isError || isLoading || !policy) {
    return <LoadState isError={isError} isLoading={isLoading || !policy} onRetry={onRetry} />;
  }
  return (
    <>
      <dl className="detail-list">
        <dt>기본 배송비</dt>
        <dd>
          <MoneyText value={policy.baseFee} />
        </dd>
        <dt>VIP 무료배송 기준 금액</dt>
        <dd>
          <MoneyText value={policy.vipFreeShippingThreshold} />
        </dd>
      </dl>
      <p className="help-text">VIP 회원의 상품 금액이 기준 금액 이상이면 배송비가 0원입니다.</p>
    </>
  );
}
