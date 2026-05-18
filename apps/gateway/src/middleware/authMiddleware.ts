export interface AuthContext {
  token?: string;
  isAuthenticated: boolean;
}

export function extractToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

// BetterAuth tokens are opaque session tokens validated by auth-service.
// Gateway forwards the raw token so subgraphs can call auth-service to resolve the user.
export function createAuthContext(authHeader?: string): AuthContext {
  const token = extractToken(authHeader);
  if (!token) return { isAuthenticated: false };
  return { token, isAuthenticated: true };
}

export function requireAuth(context: AuthContext): void {
  if (!context.isAuthenticated) {
    throw new Error('Authentication required');
  }
}
