import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ScreenProps } from '../../app/adminRoutes';
import { errorMessage } from '../../api/client';
import { changeDeliveryStatus, deliveryKeys, fetchDeliveries } from '../../api/deliveryApi';
import type { DeliveryStatus } from '../../types/delivery';
import { DeliveryListView } from './DeliveryListView';

export function DeliveryListPage({ canWrite }: ScreenProps) {
  const queryClient = useQueryClient();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: deliveryKeys.all, queryFn: fetchDeliveries });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DeliveryStatus }) =>
      changeDeliveryStatus(id, status),
    onMutate: () => setAlertMessage(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.all }),
    onError: (error) => setAlertMessage(errorMessage(error)),
  });

  return (
    <DeliveryListView
      deliveries={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      canWrite={canWrite}
      alertMessage={alertMessage}
      isSubmitting={mutation.isPending}
      onChangeStatus={(id, status) => mutation.mutate({ id, status })}
    />
  );
}
