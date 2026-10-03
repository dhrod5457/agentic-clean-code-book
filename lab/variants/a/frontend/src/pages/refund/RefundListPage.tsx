import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ScreenProps } from '../../app/adminRoutes';
import { errorMessage } from '../../api/client';
import {
  approveRefund,
  fetchRefunds,
  refundKeys,
  rejectRefund,
  requestRefund,
} from '../../api/refundApi';
import type { Refund, RefundCreateRequest } from '../../types/refund';
import { RefundListView } from './RefundListView';

type RefundCommand =
  | { type: 'request'; request: RefundCreateRequest }
  | { type: 'approve'; id: number }
  | { type: 'reject'; id: number };

function runCommand(command: RefundCommand): Promise<Refund> {
  switch (command.type) {
    case 'request':
      return requestRefund(command.request);
    case 'approve':
      return approveRefund(command.id);
    case 'reject':
      return rejectRefund(command.id);
  }
}

export function RefundListPage({ canWrite }: ScreenProps) {
  const queryClient = useQueryClient();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);

  const query = useQuery({ queryKey: refundKeys.all, queryFn: fetchRefunds });
  const mutation = useMutation({
    mutationFn: runCommand,
    onMutate: () => setAlertMessage(null),
    onSuccess: (_refund, command) => {
      if (command.type === 'request') {
        setFormOpen(false);
      }
      return queryClient.invalidateQueries({ queryKey: refundKeys.all });
    },
    onError: (error) => setAlertMessage(errorMessage(error)),
  });

  return (
    <RefundListView
      refunds={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      canWrite={canWrite}
      alertMessage={alertMessage}
      isSubmitting={mutation.isPending}
      isFormOpen={isFormOpen}
      onOpenForm={() => setFormOpen(true)}
      onCloseForm={() => setFormOpen(false)}
      onRequest={(request) => mutation.mutate({ type: 'request', request })}
      onApprove={(id) => mutation.mutate({ type: 'approve', id })}
      onReject={(id) => mutation.mutate({ type: 'reject', id })}
    />
  );
}
