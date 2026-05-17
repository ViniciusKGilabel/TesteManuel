import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import pg from 'pg';

const { Pool } = pg;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-prod-must-be-32-chars',
  database: new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://auth_user:auth_pass@localhost:5432/auth_db',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(','),
  plugins: [bearer()],
});

export type Auth = typeof auth;
