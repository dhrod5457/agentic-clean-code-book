import { useId, useState, type FormEvent } from 'react';
import type { LoginRequest } from '../../types/staff';

interface LoginViewProps {
  alertMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (request: LoginRequest) => void;
}

export function LoginView({ alertMessage, isSubmitting = false, onSubmit }: LoginViewProps) {
  const id = useId();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ loginId, password });
  }

  return (
    <main className="login">
      <h1>쇼핑몰 관리자 로그인</h1>
      {alertMessage && (
        <p role="alert" className="notice notice-error">
          {alertMessage}
        </p>
      )}
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor={`${id}-login-id`}>로그인 ID</label>
          <input
            id={`${id}-login-id`}
            type="text"
            autoComplete="username"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`${id}-password`}>비밀번호</label>
          <input
            id={`${id}-password`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button type="submit" disabled={isSubmitting}>
          로그인
        </button>
      </form>
    </main>
  );
}
