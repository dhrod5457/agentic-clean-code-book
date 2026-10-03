import { useQuery } from '@tanstack/react-query';
import { fetchMembers, memberKeys } from '../../api/memberApi';
import { MemberListView } from './MemberListView';

export function MemberListPage() {
  const query = useQuery({ queryKey: memberKeys.all, queryFn: fetchMembers });
  return (
    <MemberListView
      members={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    />
  );
}
