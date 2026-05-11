export interface AuthContext {
  token?: string;
  userId?: string;
  isAuthenticated: boolean;
}

export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export function decodeToken(token: string): Record<string, any> | null {
  try {
    const payload = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
}

export function createAuthContext(authHeader?: string): AuthContext {
  const token = extractToken(authHeader);

  if (!token) {
    return { isAuthenticated: false };
  }

  const decoded = decodeToken(token);
  if (!decoded || !decoded.sub) {
    return { isAuthenticated: false };
  }

  return {
    token,
    userId: decoded.sub,
    isAuthenticated: true,
  };
}

export function requireAuth(context: AuthContext): void {
  if (!context.isAuthenticated) {
    throw new Error('Authentication required');
  }
}
