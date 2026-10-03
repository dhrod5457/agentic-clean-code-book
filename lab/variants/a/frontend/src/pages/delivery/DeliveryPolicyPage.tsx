import { useQuery } from '@tanstack/react-query';
import { deliveryKeys, fetchDeliveryPolicy } from '../../api/deliveryApi';
import { DeliveryPolicyView } from './DeliveryPolicyView';

export function DeliveryPolicyPage() {
  const query = useQuery({ queryKey: deliveryKeys.policy, queryFn: fetchDeliveryPolicy });
  return (
    <DeliveryPolicyView
      policy={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    />
  );
}
