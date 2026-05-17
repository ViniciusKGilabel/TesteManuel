'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Search, SlidersHorizontal, Package } from 'lucide-react';
import { GET_PRODUCTS } from '@/graphql/queries/products';
import { ProductCard, ProductCardSkeleton } from '@/components/products/product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
}

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

  const { data, loading, error } = useQuery<{ products: Product[] }>(GET_PRODUCTS);

  const filtered = (data?.products ?? [])
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
        <p className="text-sm font-medium text-orange-500 mb-1">Catálogo</p>
        <h1 className="text-4xl font-extrabold tracking-tight">Todos os produtos</h1>
        {data && (
          <p className="text-muted-foreground mt-2">
            {filtered.length} {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {FILTER_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeFilter === tag
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center mb-8">
          <Package className="h-10 w-10 text-destructive/40 mx-auto mb-3" />
          <p className="font-medium text-destructive">Não foi possível carregar os produtos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Inicie os serviços: <code className="bg-muted px-1.5 py-0.5 rounded">docker-compose up</code>
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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : !error ? (
        <div className="text-center py-24">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-4">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground text-sm">
            {search ? 'Tente uma busca diferente.' : 'O catálogo está vazio por enquanto.'}
          </p>
          {search && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearch('')}>
              Limpar busca
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
