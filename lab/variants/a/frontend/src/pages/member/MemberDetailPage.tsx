import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import type { ScreenProps } from '../../app/adminRoutes';
import { errorMessage } from '../../api/client';
import {
  changeMemberGrade,
  changeMemberStatus,
  fetchMember,
  memberKeys,
  withdrawMember,
} from '../../api/memberApi';
import type { Member } from '../../types/member';
import { MemberDetailView, type MemberAction } from './MemberDetailView';

function runAction(id: number, action: MemberAction): Promise<Member> {
  switch (action) {
    case 'suspend':
      return changeMemberStatus(id, 'SUSPENDED');
    case 'activate':
      return changeMemberStatus(id, 'ACTIVE');
    case 'toVip':
      return changeMemberGrade(id, 'VIP');
    case 'toGeneral':
      return changeMemberGrade(id, 'GENERAL');
    case 'withdraw':
      return withdrawMember(id);
  }
}

export function MemberDetailPage({ canWrite }: ScreenProps) {
  const id = Number(useParams().id);
  const queryClient = useQueryClient();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: memberKeys.detail(id), queryFn: () => fetchMember(id) });
  const mutation = useMutation({
    mutationFn: (action: MemberAction) => runAction(id, action),
    onMutate: () => setAlertMessage(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.all }),
    onError: (error) => setAlertMessage(errorMessage(error)),
  });

  return (
    <MemberDetailView
      member={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      canWrite={canWrite}
      alertMessage={alertMessage}
      isSubmitting={mutation.isPending}
      onAction={(action) => mutation.mutate(action)}
    />
  );
}
