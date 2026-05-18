'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, Package } from 'lucide-react';
import { ProductCard, ProductCardSkeleton } from '@/components/products/product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { useProducts } from '@/hooks/use-products';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { label: 'Relevância', value: 'relevance' },
  { label: 'Menor preço', value: 'price-asc' },
  { label: 'Maior preço', value: 'price-desc' },
  { label: 'Em estoque', value: 'stock' },
];

const FILTER_TAGS = ['Todos', 'Em estoque', 'Promoção', 'Novidades', 'Mais vendidos'];

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevance');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const { products: allProducts, loading, error } = useProducts();
  const { addItem } = useCart();

  const filtered = allProducts
    .filter((p) => {
      const q = search.toLowerCase();
      const matches = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      if (activeFilter === 'Em estoque') return matches && p.stock > 0;
      return matches;
    })
    .sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'stock') return b.stock - a.stock;
      return 0;
    });

  return (
    <div className="container py-10">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest text-[#71717a] uppercase mb-2">Catálogo</p>
        <h1 className="text-4xl font-light tracking-tight">Todos os produtos</h1>
        {!loading && allProducts.length > 0 && (
          <p className="text-[#71717a] mt-2 text-sm">
            {filtered.length} {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a1a1aa]" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-full border-[#e4e4e7] focus-visible:ring-black"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-full border border-[#e4e4e7] bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-black text-[#3f3f46]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {FILTER_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm transition-all',
              activeFilter === tag
                ? 'bg-black text-white font-medium'
                : 'bg-white border border-[#e4e4e7] text-[#71717a] hover:border-black hover:text-black'
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-[#e4e4e7] bg-white p-8 text-center mb-8">
          <Package className="h-10 w-10 text-[#d4d4d8] mx-auto mb-3" />
          <p className="font-medium text-black">Não foi possível carregar os produtos</p>
          <p className="text-sm text-[#71717a] mt-1">
            Inicie os serviços: <code className="bg-[#f4f4f5] px-1.5 py-0.5 rounded-md font-mono text-xs">docker-compose up</code>
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => addItem({ id: product.id, name: product.name, price: product.price, currency: product.currency })}
            />
          ))}
        </div>
      ) : !error ? (
        <EmptyState
          icon={<Package className="h-10 w-10 text-[#a1a1aa]" strokeWidth={1} />}
          title="Nenhum produto encontrado"
          description={search ? 'Tente uma busca diferente.' : 'O catálogo está vazio por enquanto.'}
          action={search ? (
            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
              Limpar busca
            </Button>
          ) : undefined}
        />
      ) : null}
    </div>
  );
}
