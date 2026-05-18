'use client';

import { ShoppingCart, Package } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

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
  const inStock = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="group relative bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative h-52 bg-[#f4f4f5] flex items-center justify-center overflow-hidden">
        <Package className="h-16 w-16 text-[#a1a1aa]" strokeWidth={1} />

        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {!inStock && <Badge variant="destructive">Esgotado</Badge>}
          {lowStock && <Badge variant="warning">Últimas unidades</Badge>}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-medium text-base leading-tight line-clamp-2 mb-1.5 group-hover:opacity-70 transition-opacity">
          {product.name}
        </h3>

        <p className="text-sm text-[#71717a] line-clamp-2 mb-4 leading-relaxed">
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold text-black">
              {formatPrice(product.price, product.currency)}
            </p>
            <p className="text-xs text-[#a1a1aa] mt-0.5">em até 12x sem juros</p>
          </div>

          <Button
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
    <div className="bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden">
      <div className="h-52 bg-[#f4f4f5] animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-[#f4f4f5] rounded-full animate-pulse w-3/4" />
        <div className="h-4 bg-[#f4f4f5] rounded-full animate-pulse" />
        <div className="h-4 bg-[#f4f4f5] rounded-full animate-pulse w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 bg-[#f4f4f5] rounded-full animate-pulse w-20" />
          <div className="h-8 bg-[#f4f4f5] rounded-full animate-pulse w-28" />
        </div>
      </div>
    </div>
  );
}
