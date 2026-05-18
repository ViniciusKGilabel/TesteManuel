import type { Metadata } from 'next';
import { ClientProviders } from '@/components/client-providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ManuelShop — E-commerce',
  description: 'Plataforma de e-commerce com GraphQL Federation e DDD',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ClientProviders>
          <main className="min-h-screen">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
