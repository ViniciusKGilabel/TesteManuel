import { createAuthClient } from 'better-auth/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001',
  fetchOptions: {
    // Required for cross-origin cookie-based sessions (frontend :3000 → auth-service :3001)
    credentials: 'include',
  },
}) as any;
