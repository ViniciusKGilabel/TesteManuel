'use client';

import { useState } from 'react';
import { Package, Clock, CheckCircle2, XCircle, Truck, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
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

export function OrderCard({ order }: { order: Order }) {
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
                  <div className="h-10 w-10 rounded-lg bg-[#f4f4f5] flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-[#a1a1aa]" strokeWidth={1.5} />
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
