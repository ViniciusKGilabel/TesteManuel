import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './infrastructure/auth/auth.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

// BetterAuth handles CORS via trustedOrigins — do NOT add a separate cors() middleware
// before this handler or the response will have duplicate Access-Control-Allow-Origin headers.
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.listen(port, () => {
  console.log(`[auth-service] listening on :${port}`);
  console.log(`[auth-service] BetterAuth endpoints at /api/auth/*`);
});
