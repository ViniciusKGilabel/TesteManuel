import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './infrastructure/auth/auth.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(',');

app.use('/api/auth', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && trustedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.listen(port, () => {
  console.log(`[auth-service] listening on :${port}`);
  console.log(`[auth-service] BetterAuth endpoints at /api/auth/*`);
});
