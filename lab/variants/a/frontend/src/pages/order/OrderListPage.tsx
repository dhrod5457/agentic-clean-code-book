import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ScreenProps } from '../../app/adminRoutes';
import { errorMessage } from '../../api/client';
import { expireOverdueOrders, fetchOrders, orderKeys } from '../../api/orderApi';
import { OrderListView } from './OrderListView';

export function OrderListPage({ canWrite }: ScreenProps) {
  const queryClient = useQueryClient();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: orderKeys.all, queryFn: fetchOrders });
  const expire = useMutation({
    mutationFn: expireOverdueOrders,
    onMutate: () => {
      setAlertMessage(null);
      setStatusMessage(null);
    },
    onSuccess: (result) => {
      setStatusMessage(`${result.expiredCount}건을 만료 처리했습니다.`);
      return queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => setAlertMessage(errorMessage(error)),
  });

  return (
    <OrderListView
      orders={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      canWrite={canWrite}
      alertMessage={alertMessage}
      statusMessage={statusMessage}
      isExpiring={expire.isPending}
      onExpireOverdue={() => expire.mutate()}
    />
  );
}
