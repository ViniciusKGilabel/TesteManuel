'use client';

import Link from 'next/link';
import { ArrowRight, Shield, Truck, RefreshCw, Star, Zap } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/products/product-card';
import { GET_PRODUCTS } from '@/graphql/queries/products';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
}

const CATEGORIES = [
  { label: 'Eletrônicos', emoji: '📱', color: 'from-blue-400 to-indigo-500' },
  { label: 'Moda', emoji: '👗', color: 'from-pink-400 to-rose-500' },
  { label: 'Casa & Jardim', emoji: '🏡', color: 'from-emerald-400 to-teal-500' },
  { label: 'Esportes', emoji: '⚽', color: 'from-orange-400 to-amber-500' },
  { label: 'Livros', emoji: '📚', color: 'from-violet-400 to-purple-500' },
  { label: 'Beleza', emoji: '✨', color: 'from-fuchsia-400 to-pink-500' },
];

const FEATURES = [
  { icon: Truck, title: 'Frete grátis', desc: 'Em pedidos acima de R$ 200' },
  { icon: Shield, title: 'Compra segura', desc: 'Pagamento 100% protegido' },
  { icon: RefreshCw, title: 'Troca fácil', desc: '30 dias para devolver' },
  { icon: Star, title: 'Garantia', desc: 'Produtos originais' },
];

export default function HomePage() {
  const { data, loading } = useQuery<{ products: Product[] }>(GET_PRODUCTS);
  const featured = data?.products?.slice(0, 4) ?? [];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-rose-500 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500 rounded-full blur-3xl" />
        </div>

        <div className="container relative py-28 md:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm mb-6 border border-white/20">
              <Zap className="h-3.5 w-3.5 text-orange-400" />
              <span>Nova temporada chegou</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-none tracking-tight mb-6">
              Compre o que
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
                você ama
              </span>
            </h1>

            <p className="text-lg text-zinc-300 mb-8 leading-relaxed max-w-lg">
              Milhares de produtos com os melhores preços, entrega rápida e pagamento seguro. A sua experiência de compra começa aqui.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button variant="brand" size="xl" asChild>
                <Link href="/products">
                  Ver produtos <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="border-white/30 text-white bg-white/10 hover:bg-white/20"
                asChild
              >
                <Link href="/orders">Meus pedidos</Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 mt-10 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['from-violet-400 to-purple-600', 'from-orange-400 to-rose-500', 'from-emerald-400 to-teal-500', 'from-blue-400 to-indigo-500'].map((g, i) => (
                    <div key={i} className={`h-7 w-7 rounded-full bg-gradient-to-br ${g} border-2 border-zinc-900`} />
                  ))}
                </div>
                <span>+12k clientes satisfeitos</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-white">4.9</span>
                <span>avaliação</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bar */}
      <section className="border-b">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 py-2">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-orange-500 mb-1">Explorar</p>
            <h2 className="text-3xl font-bold">Categorias</h2>
          </div>
          <Link href="/products" className="text-sm font-medium hover:text-orange-500 transition-colors">
            Ver todas →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href="/products"
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border hover:border-orange-200 hover:bg-orange-50/50 transition-all"
            >
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform`}>
                {cat.emoji}
              </div>
              <span className="text-sm font-medium text-center">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-orange-500 mb-1">Destaques</p>
            <h2 className="text-3xl font-bold">Produtos em alta</h2>
          </div>
          <Link href="/products" className="text-sm font-medium hover:text-orange-500 transition-colors">
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
            <p className="text-muted-foreground font-medium">API desconectada — inicie os serviços com</p>
            <code className="text-sm bg-muted px-3 py-1.5 rounded-lg mt-2 inline-block font-mono">docker-compose up</code>
          </div>
        )}

        <div className="mt-10 text-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="/products">Ver catálogo completo <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-rose-500 text-white p-10 md:p-14">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
          <div className="relative max-w-lg">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">Primeira compra?</h2>
            <p className="text-white/80 text-lg mb-6">
              Use o código <strong>BEMVINDO</strong> e ganhe 15% de desconto no seu primeiro pedido.
            </p>
            <Button size="lg" className="bg-white text-orange-500 hover:bg-white/90 font-bold" asChild>
              <Link href="/products">Comprar agora</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
