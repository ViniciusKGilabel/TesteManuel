'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../lib/apolloClient';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
      </body>
    </html>
  );
}
