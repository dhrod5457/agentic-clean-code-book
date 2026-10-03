import { LoadState } from '../../components/DataTable';
import { DateTimeText } from '../../components/DateTimeText';
import { StatusBadge } from '../../components/StatusBadge';
import { MEMBER_GRADE_LABELS, MEMBER_STATUS_LABELS, type Member } from '../../types/member';

export type MemberAction = 'suspend' | 'activate' | 'toVip' | 'toGeneral' | 'withdraw';

interface MemberDetailViewProps {
  member: Member | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canWrite: boolean;
  alertMessage?: string | null;
  isSubmitting?: boolean;
  onAction: (action: MemberAction) => void;
}

function actionsFor(member: Member): { action: MemberAction; label: string }[] {
  if (member.status === 'WITHDRAWN') {
    return [];
  }
  return [
    member.status === 'ACTIVE'
      ? { action: 'suspend', label: '정지' }
      : { action: 'activate', label: '정지 해제' },
    member.grade === 'GENERAL'
      ? { action: 'toVip', label: 'VIP로 변경' }
      : { action: 'toGeneral', label: '일반으로 변경' },
    { action: 'withdraw', label: '탈퇴 처리' },
  ];
}

export function MemberDetailView({
  member,
  isLoading,
  isError,
  onRetry,
  canWrite,
  alertMessage,
  isSubmitting = false,
  onAction,
}: MemberDetailViewProps) {
  if (isError || isLoading || !member) {
    return <LoadState isError={isError} isLoading={isLoading || !member} onRetry={onRetry} />;
  }

  const actions = canWrite ? actionsFor(member) : [];

  return (
    <>
      {alertMessage && (
        <p role="alert" className="notice notice-error">
          {alertMessage}
        </p>
      )}
      {actions.length > 0 && (
        <div className="toolbar">
          {actions.map(({ action, label }) => (
            <button
              key={action}
              type="button"
              disabled={isSubmitting}
              onClick={() => onAction(action)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <dl className="detail-list">
        <dt>ID</dt>
        <dd>{member.id}</dd>
        <dt>이름</dt>
        <dd>{member.name}</dd>
        <dt>이메일</dt>
        <dd>{member.email}</dd>
        <dt>등급</dt>
        <dd>{MEMBER_GRADE_LABELS[member.grade]}</dd>
        <dt>상태</dt>
        <dd>
          <StatusBadge status={member.status} label={MEMBER_STATUS_LABELS[member.status]} />
        </dd>
        <dt>가입일시</dt>
        <dd>
          <DateTimeText value={member.joinedAt} />
        </dd>
        <dt>마지막 로그인</dt>
        <dd>
          <DateTimeText value={member.lastLoginAt} />
        </dd>
        <dt>탈퇴일시</dt>
        <dd>
          <DateTimeText value={member.withdrawnAt} />
        </dd>
      </dl>
    </>
  );
}
