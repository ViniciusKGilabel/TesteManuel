import {
  extractToken,
  decodeToken,
  createAuthContext,
  requireAuth,
} from '../../middleware/authMiddleware';

describe('Auth Middleware', () => {
  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const token = extractToken('Bearer eyJzdWIiOiIxMjM0NTY3ODkwIn0=');
      expect(token).toBe('eyJzdWIiOiIxMjM0NTY3ODkwIn0=');
    });

    it('should return null for missing header', () => {
      const token = extractToken(undefined);
      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = extractToken('');
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const token = extractToken('Basic dXNlcjpwYXNz');
      expect(token).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode valid base64 token', () => {
      const payload = { sub: 'user123', iat: 1234567890 };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
      const decoded = decodeToken(encoded);

      expect(decoded).toEqual(payload);
      expect(decoded?.sub).toBe('user123');
    });

    it('should return null for invalid base64', () => {
      const decoded = decodeToken('invalid!!!token');
      expect(decoded).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const encoded = Buffer.from('not valid json').toString('base64');
      const decoded = decodeToken(encoded);
      expect(decoded).toBeNull();
    });
  });

  describe('createAuthContext', () => {
    it('should create authenticated context with valid token', () => {
      const payload = { sub: 'user123', iat: 1234567890 };
      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const context = createAuthContext(`Bearer ${token}`);

      expect(context.isAuthenticated).toBe(true);
      expect(context.userId).toBe('user123');
      expect(context.token).toBe(token);
    });

    it('should create unauthenticated context without header', () => {
      const context = createAuthContext(undefined);

      expect(context.isAuthenticated).toBe(false);
      expect(context.userId).toBeUndefined();
      expect(context.token).toBeUndefined();
    });

    it('should create unauthenticated context with invalid token', () => {
      const context = createAuthContext('Bearer invalid!!!');

      expect(context.isAuthenticated).toBe(false);
      expect(context.userId).toBeUndefined();
    });

    it('should create unauthenticated context with missing sub claim', () => {
      const payload = { iat: 1234567890 };
      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const context = createAuthContext(`Bearer ${token}`);

      expect(context.isAuthenticated).toBe(false);
      expect(context.userId).toBeUndefined();
    });
  });

  describe('requireAuth', () => {
    it('should throw error for unauthenticated context', () => {
      const context = { isAuthenticated: false };
      expect(() => requireAuth(context)).toThrow('Authentication required');
    });

    it('should not throw for authenticated context', () => {
      const context = { isAuthenticated: true, userId: 'user123', token: 'token' };
      expect(() => requireAuth(context)).not.toThrow();
    });
  });
});
