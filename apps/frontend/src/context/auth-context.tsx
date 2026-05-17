'use client';

import { useCallback } from 'react';
import { authClient } from '@/lib/authClient';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  isPending: boolean;
  logout: () => Promise<void>;
}

// AuthProvider is a passthrough — BetterAuth manages session state internally.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): UseAuthReturn {
  const { data: session, isPending } = authClient.useSession();

  const logout = useCallback(async () => {
    await authClient.signOut();
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  }, []);

  return {
    user: session?.user
      ? { id: session.user.id, email: session.user.email, name: session.user.name }
      : null,
    isPending,
    logout,
  };
}
