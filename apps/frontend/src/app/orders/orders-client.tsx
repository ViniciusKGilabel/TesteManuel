'use client';

import { useQuery } from '@apollo/client/react';
import { Package, Clock, CheckCircle2, XCircle, Truck, ChevronDown, ShoppingBag, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { GET_MY_ORDERS } from '@/graphql/queries/orders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { formatPrice, formatDate } from '@/lib/utils';

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

type BadgeVariant = 'warning' | 'info' | 'purple' | 'success' | 'destructive' | 'outline';

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon: React.ElementType }> = {
  PENDING:   { label: 'Pendente',   variant: 'warning',     icon: Clock },
  CONFIRMED: { label: 'Confirmado', variant: 'info',        icon: CheckCircle2 },
  SHIPPED:   { label: 'Enviado',    variant: 'purple',      icon: Truck },
  DELIVERED: { label: 'Entregue',   variant: 'success',     icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado',  variant: 'destructive', icon: XCircle },
};

function OrderCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[order.status] ?? { label: order.status, variant: 'outline' as BadgeVariant, icon: Package };
  const StatusIcon = config.icon;

  return (
    <div className="rounded-2xl border bg-white overflow-hidden hover:shadow-md transition-shadow">
      <button
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground mb-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
            <p className="font-semibold">{formatDate(order.createdAt)}</p>
            <p className="text-sm text-muted-foreground">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="font-bold text-lg hidden sm:block">{formatPrice(order.total)}</p>
          <Badge variant={config.variant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/30 p-5">
          <p className="font-bold text-lg mb-4 sm:hidden">{formatPrice(order.total)}</p>

          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Itens do pedido</h4>
          <div className="space-y-2 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                    📦
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium">{item.productId.slice(0, 12)}…</p>
                    <p className="text-xs text-muted-foreground">{item.quantity}x · {formatPrice(item.unitPrice)} cada</p>
                  </div>
                </div>
                <p className="font-semibold text-sm">{formatPrice(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center border-t pt-3">
            <p className="text-sm text-muted-foreground">Total do pedido</p>
            <p className="font-bold">{formatPrice(order.total)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <p className="text-sm font-medium text-orange-500 mb-1">Conta</p>
        <h1 className="text-4xl font-extrabold tracking-tight">Meus pedidos</h1>
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
        <div className="text-center py-24">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-muted mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <h3 className="font-bold text-xl mb-2">Você ainda não tem pedidos</h3>
          <p className="text-muted-foreground mb-6">Comece explorando o nosso catálogo de produtos.</p>
          <Button variant="brand" size="lg" asChild>
            <Link href="/products">Ver produtos <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
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
