const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Required for pnpm monorepo: trace files from repo root so standalone includes hoisted node_modules
  outputFileTracingRoot: path.join(__dirname, '../../'),
  serverExternalPackages: ['@apollo/client'],
};

module.exports = nextConfig;
