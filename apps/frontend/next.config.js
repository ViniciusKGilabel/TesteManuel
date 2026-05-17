/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@apollo/client'],
};

module.exports = nextConfig;
