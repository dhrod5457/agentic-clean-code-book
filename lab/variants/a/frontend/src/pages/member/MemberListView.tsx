import { Link } from 'react-router';
import { DataTable, type Column } from '../../components/DataTable';
import { DateTimeText } from '../../components/DateTimeText';
import { StatusBadge } from '../../components/StatusBadge';
import { MEMBER_GRADE_LABELS, MEMBER_STATUS_LABELS, type Member } from '../../types/member';

const columns: Column<Member>[] = [
  { header: 'ID', cell: (member) => member.id },
  {
    header: '이름',
    cell: (member) => <Link to={`/members/${member.id}`}>{member.name}</Link>,
  },
  { header: '이메일', cell: (member) => member.email },
  { header: '등급', cell: (member) => MEMBER_GRADE_LABELS[member.grade] },
  {
    header: '상태',
    cell: (member) => (
      <StatusBadge status={member.status} label={MEMBER_STATUS_LABELS[member.status]} />
    ),
  },
  { header: '가입일시', cell: (member) => <DateTimeText value={member.joinedAt} /> },
  { header: '마지막 로그인', cell: (member) => <DateTimeText value={member.lastLoginAt} /> },
];

interface MemberListViewProps {
  members: Member[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function MemberListView({ members, isLoading, isError, onRetry }: MemberListViewProps) {
  return (
    <DataTable
      label="회원 목록"
      columns={columns}
      rows={members}
      rowKey={(member) => member.id}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    />
  );
}
