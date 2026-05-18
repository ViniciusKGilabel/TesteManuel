'use client';

import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/apolloClient';
import { CartProvider } from '@/context/cart-context';
import { AuthProvider } from '@/context/auth-context';
import { CartSidebar } from '@/components/cart/cart-sidebar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <CartProvider>
          <Navbar />
          <CartSidebar />
          {children}
          <Footer />
        </CartProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
