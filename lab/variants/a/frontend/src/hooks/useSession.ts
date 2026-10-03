import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, login, logout, staffKeys } from '../api/staffApi';
import type { LoginRequest } from '../types/staff';

/** 현재 로그인한 관리자. 로그인하지 않았으면 data 가 null 이다. */
export function useSession() {
  return useQuery({
    queryKey: staffKeys.session,
    queryFn: fetchCurrentUser,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: (user) => {
      queryClient.setQueryData(staffKeys.session, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(staffKeys.session, null);
    },
  });
}
