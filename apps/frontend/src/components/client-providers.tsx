'use client';

import dynamic from 'next/dynamic';

const ProvidersNoSSR = dynamic(
  () => import('./providers').then((m) => ({ default: m.Providers })),
  { ssr: false }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ProvidersNoSSR>{children}</ProvidersNoSSR>;
}
