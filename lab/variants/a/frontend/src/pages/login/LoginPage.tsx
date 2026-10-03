import { Navigate, useNavigate } from 'react-router';
import { errorMessage } from '../../api/client';
import { useLogin, useSession } from '../../hooks/useSession';
import { LoginView } from './LoginView';

export function LoginPage() {
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();

  if (session.data) {
    return <Navigate to="/members" replace />;
  }

  return (
    <LoginView
      alertMessage={login.isError ? errorMessage(login.error) : null}
      isSubmitting={login.isPending}
      onSubmit={(request) =>
        login.mutate(request, { onSuccess: () => void navigate('/members', { replace: true }) })
      }
    />
  );
}
