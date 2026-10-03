import { useId, useState, type FormEvent } from 'react';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import {
  ROLE_LABELS,
  ROLES,
  staffActiveLabel,
  type Role,
  type Staff,
  type StaffCreateRequest,
} from '../../types/staff';

const columns: Column<Staff>[] = [
  { header: '로그인 ID', cell: (staff) => staff.loginId },
  { header: '이름', cell: (staff) => staff.name },
  { header: '부서', cell: (staff) => staff.department },
  { header: '역할', cell: (staff) => ROLE_LABELS[staff.role] },
  {
    header: '상태',
    cell: (staff) => (
      <StatusBadge
        status={staff.active ? 'ACTIVE' : 'INACTIVE'}
        label={staffActiveLabel(staff.active)}
      />
    ),
  },
];

function RoleSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value as Role)}>
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

interface StaffCreateFormProps {
  isSubmitting: boolean;
  onSubmit: (request: StaffCreateRequest) => void;
  onCancel: () => void;
}

function StaffCreateForm({ isSubmitting, onSubmit, onCancel }: StaffCreateFormProps) {
  const id = useId();
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ loginId, name, department, role, password });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor={`${id}-login-id`}>로그인 ID</label>
        <input
          id={`${id}-login-id`}
          type="text"
          autoComplete="off"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-name`}>이름</label>
        <input
          id={`${id}-name`}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-department`}>부서</label>
        <input
          id={`${id}-department`}
          type="text"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-role`}>역할</label>
        <RoleSelect id={`${id}-role`} value={role} onChange={setRole} />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-password`}>비밀번호</label>
        <input
          id={`${id}-password`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          등록
        </button>
        <button type="button" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  );
}

interface StaffRoleEditorProps {
  staff: Staff;
  isSubmitting: boolean;
  onSave: (role: Role) => void;
  onCancel: () => void;
}

function StaffRoleEditor({ staff, isSubmitting, onSave, onCancel }: StaffRoleEditorProps) {
  const id = useId();
  const [role, setRole] = useState<Role>(staff.role);
  return (
    <div className="row-editor">
      <label htmlFor={`${id}-role`}>역할</label>
      <RoleSelect id={`${id}-role`} value={role} onChange={setRole} />
      <button type="button" disabled={isSubmitting} onClick={() => onSave(role)}>
        저장
      </button>
      <button type="button" onClick={onCancel}>
        취소
      </button>
    </div>
  );
}

interface StaffListViewProps {
  staff: Staff[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canWrite: boolean;
  alertMessage?: string | null;
  isSubmitting?: boolean;
  isCreateFormOpen: boolean;
  onOpenCreateForm: () => void;
  onCloseCreateForm: () => void;
  onCreate: (request: StaffCreateRequest) => void;
  editingId: number | null;
  onEdit: (id: number) => void;
  onCancelEdit: () => void;
  onSaveRole: (id: number, role: Role) => void;
  onDeactivate: (id: number) => void;
}

export function StaffListView({
  staff,
  isLoading,
  isError,
  onRetry,
  canWrite,
  alertMessage,
  isSubmitting = false,
  isCreateFormOpen,
  onOpenCreateForm,
  onCloseCreateForm,
  onCreate,
  editingId,
  onEdit,
  onCancelEdit,
  onSaveRole,
  onDeactivate,
}: StaffListViewProps) {
  return (
    <>
      {alertMessage && (
        <p role="alert" className="notice notice-error">
          {alertMessage}
        </p>
      )}
      {canWrite && !isCreateFormOpen && (
        <div className="toolbar">
          <button type="button" onClick={onOpenCreateForm}>
            관리자 계정 추가
          </button>
        </div>
      )}
      {canWrite && isCreateFormOpen && (
        <StaffCreateForm
          isSubmitting={isSubmitting}
          onSubmit={onCreate}
          onCancel={onCloseCreateForm}
        />
      )}
      <DataTable
        label="관리자 계정 목록"
        columns={columns}
        rows={staff}
        rowKey={(item) => item.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        renderActions={
          canWrite
            ? (item) =>
                item.active ? (
                  <>
                    <button type="button" onClick={() => onEdit(item.id)}>
                      수정
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onDeactivate(item.id)}
                    >
                      비활성화
                    </button>
                  </>
                ) : null
            : undefined
        }
        renderRowDetail={(item) =>
          canWrite && item.id === editingId ? (
            <StaffRoleEditor
              staff={item}
              isSubmitting={isSubmitting}
              onSave={(role) => onSaveRole(item.id, role)}
              onCancel={onCancelEdit}
            />
          ) : null
        }
      />
    </>
  );
}
