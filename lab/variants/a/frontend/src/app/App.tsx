import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router';
import { isApiError } from '../api/client';
import { staffKeys } from '../api/staffApi';
import { LoadState } from '../components/DataTable';
import { useLogout, useSession } from '../hooks/useSession';
import { LoginPage } from '../pages/login/LoginPage';
import { hasPermission } from '../types/permission';
import { adminRoutes, type AdminRoute } from './adminRoutes';
import { Layout } from './Layout';
import { RequirePermission } from './RequirePermission';

export function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleAuthError }),
    mutationCache: new MutationCache({ onError: handleAuthError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status < 500) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  // 세션이 끝났으면(401 AUTH_REQUIRED) 로그아웃 상태로 바꾼다. 화면은 /login 으로 이동한다.
  function handleAuthError(error: unknown) {
    if (isApiError(error) && error.code === 'AUTH_REQUIRED') {
      queryClient.setQueryData(staffKeys.session, null);
    }
  }

  return queryClient;
}

function AuthenticatedLayout() {
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  if (session.isPending || session.isError) {
    return (
      <LoadState
        isLoading={session.isPending}
        isError={session.isError}
        onRetry={() => void session.refetch()}
      />
    );
  }
  if (!session.data) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout
      user={session.data}
      isLoggingOut={logout.isPending}
      onLogout={() =>
        logout.mutate(undefined, { onSettled: () => void navigate('/login', { replace: true }) })
      }
    />
  );
}

function Screen({ route }: { route: AdminRoute }) {
  const { data: user } = useSession();
  const Component = route.component;
  return (
    <RequirePermission title={route.title} permission={route.readPermission}>
      <Component canWrite={hasPermission(user?.permissions, route.writePermission)} />
    </RequirePermission>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthenticatedLayout />}>
        <Route index element={<Navigate to="/members" replace />} />
        {adminRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={<Screen route={route} />} />
        ))}
        <Route path="*" element={<Navigate to="/members" replace />} />
      </Route>
    </Routes>
  );
}

const queryClient = createQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
