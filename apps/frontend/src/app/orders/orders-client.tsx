'use client';

import { useQuery } from '@apollo/client/react';
import { XCircle, ShoppingBag, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { GET_MY_ORDERS } from '@/graphql/queries/orders';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { OrderCard, type Order } from '@/components/orders/order-card';
import { useAuth } from '@/context/auth-context';

export default function OrdersPage() {
  const { user } = useAuth();
  const { data, loading, error } = useQuery<{ orders: Order[] }>(GET_MY_ORDERS, {
    variables: { userId: user?.id ?? '' },
    skip: !user,
  });

  if (!user) {
    return (
      <div className="container py-24 flex flex-col items-center text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-muted mb-6">
          <Lock className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Faça login para ver seus pedidos</h2>
        <p className="text-muted-foreground mb-6">Você precisa estar autenticado para acessar esta página.</p>
        <Button variant="brand" size="lg" asChild>
          <Link href="/login">Entrar na conta <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest text-[#71717a] uppercase mb-2">Conta</p>
        <h1 className="text-4xl font-light tracking-tight">Meus pedidos</h1>
        {data && (
          <p className="text-muted-foreground mt-2">
            {data.orders.length} {data.orders.length === 1 ? 'pedido' : 'pedidos'} encontrado{data.orders.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <XCircle className="h-10 w-10 text-destructive/40 mx-auto mb-3" />
          <p className="font-medium text-destructive">Erro ao carregar pedidos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Inicie o order-service: <code className="bg-muted px-1.5 py-0.5 rounded">docker-compose up</code>
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !error && data?.orders.length === 0 && (
        <EmptyState
          icon={<ShoppingBag className="h-12 w-12 text-muted-foreground/40" />}
          title="Você ainda não tem pedidos"
          description="Comece explorando o nosso catálogo de produtos."
          action={
            <Button variant="brand" size="lg" asChild>
              <Link href="/products">Ver produtos <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          }
        />
      )}

      {!loading && !error && data && data.orders.length > 0 && (
        <div className="space-y-4">
          {data.orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
