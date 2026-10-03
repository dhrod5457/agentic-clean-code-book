import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { fetchOrder, orderKeys } from '../../api/orderApi';
import { OrderDetailView } from './OrderDetailView';

export function OrderDetailPage() {
  const id = Number(useParams().id);
  const query = useQuery({ queryKey: orderKeys.detail(id), queryFn: () => fetchOrder(id) });
  return (
    <OrderDetailView
      order={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    />
  );
}
