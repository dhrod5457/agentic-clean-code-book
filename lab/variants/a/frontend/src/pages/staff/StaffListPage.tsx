import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ScreenProps } from '../../app/adminRoutes';
import { errorMessage } from '../../api/client';
import {
  changeStaffRole,
  createStaff,
  deactivateStaff,
  fetchStaff,
  staffKeys,
} from '../../api/staffApi';
import type { Role, Staff, StaffCreateRequest } from '../../types/staff';
import { StaffListView } from './StaffListView';

type StaffCommand =
  | { type: 'create'; request: StaffCreateRequest }
  | { type: 'changeRole'; id: number; role: Role }
  | { type: 'deactivate'; id: number };

function runCommand(command: StaffCommand): Promise<Staff> {
  switch (command.type) {
    case 'create':
      return createStaff(command.request);
    case 'changeRole':
      return changeStaffRole(command.id, command.role);
    case 'deactivate':
      return deactivateStaff(command.id);
  }
}

export function StaffListPage({ canWrite }: ScreenProps) {
  const queryClient = useQueryClient();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isCreateFormOpen, setCreateFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const query = useQuery({ queryKey: staffKeys.all, queryFn: fetchStaff });
  const mutation = useMutation({
    mutationFn: runCommand,
    onMutate: () => setAlertMessage(null),
    onSuccess: (_staff, command) => {
      if (command.type === 'create') {
        setCreateFormOpen(false);
      } else {
        setEditingId(null);
      }
      // 역할이 바뀌면 내 권한도 바뀔 수 있으므로 세션도 다시 읽는다
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.all }),
        queryClient.invalidateQueries({ queryKey: staffKeys.session }),
      ]);
    },
    onError: (error) => setAlertMessage(errorMessage(error)),
  });

  return (
    <StaffListView
      staff={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      canWrite={canWrite}
      alertMessage={alertMessage}
      isSubmitting={mutation.isPending}
      isCreateFormOpen={isCreateFormOpen}
      onOpenCreateForm={() => {
        setEditingId(null);
        setCreateFormOpen(true);
      }}
      onCloseCreateForm={() => setCreateFormOpen(false)}
      onCreate={(request) => mutation.mutate({ type: 'create', request })}
      editingId={editingId}
      onEdit={(id) => {
        setCreateFormOpen(false);
        setEditingId(id);
      }}
      onCancelEdit={() => setEditingId(null)}
      onSaveRole={(id, role) => mutation.mutate({ type: 'changeRole', id, role })}
      onDeactivate={(id) => mutation.mutate({ type: 'deactivate', id })}
    />
  );
}
