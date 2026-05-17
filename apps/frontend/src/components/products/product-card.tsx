'use client';

import { ShoppingCart, Star, Package } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, getProductGradient } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const gradient = getProductGradient(product.id);
  const inStock = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="group relative bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className={`relative h-52 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_white_0%,_transparent_60%)]" />
        <Package className="h-20 w-20 text-white/70" strokeWidth={1} />

        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {!inStock && <Badge variant="destructive">Esgotado</Badge>}
          {lowStock && <Badge variant="warning">Últimas unidades</Badge>}
          {product.stock > 20 && <Badge variant="success">Em estoque</Badge>}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-orange-500 transition-colors mb-1.5">
          {product.name}
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {product.description}
        </p>

        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
          <span className="text-xs text-muted-foreground ml-1">(48)</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {formatPrice(product.price, product.currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">em até 12x sem juros</p>
          </div>

          <Button
            variant="brand"
            size="sm"
            onClick={() => addItem({ id: product.id, name: product.name, price: product.price, currency: product.currency })}
            disabled={!inStock}
            className="gap-1.5"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {inStock ? 'Adicionar' : 'Esgotado'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="h-52 bg-muted animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-7 bg-muted rounded animate-pulse w-24" />
          <div className="h-9 bg-muted rounded animate-pulse w-28" />
        </div>
      </div>
    </div>
  );
}
