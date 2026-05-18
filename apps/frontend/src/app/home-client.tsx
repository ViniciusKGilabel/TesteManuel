'use client';

import Link from 'next/link';
import { ArrowRight, Shield, Truck, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/products/product-card';
import { useCart } from '@/context/cart-context';
import { useProducts } from '@/hooks/use-products';

const FEATURES = [
  { icon: Truck, title: 'Frete grátis', desc: 'Em pedidos acima de R$ 200' },
  { icon: Shield, title: 'Compra segura', desc: 'Pagamento 100% protegido' },
  { icon: RefreshCw, title: 'Troca fácil', desc: '30 dias para devolver' },
  { icon: Star, title: 'Garantia', desc: 'Produtos originais' },
];

export default function HomePage() {
  const { products, loading } = useProducts();
  const { addItem } = useCart();
  const featured = products.slice(0, 4);

  return (
    <>
      {/* Hero — cinematic dark */}
      <section className="bg-black text-white">
        <div className="container py-28 md:py-40">
          <div className="max-w-3xl">
            <p className="text-xs font-medium tracking-widest text-[#9dabad] uppercase mb-6">
              Nova temporada chegou
            </p>

            <h1
              className="text-6xl md:text-8xl font-light leading-none tracking-tight mb-8"
              style={{ fontFeatureSettings: '"ss03"' }}
            >
              Compre o que
              <br />
              <span className="font-normal">você ama</span>
            </h1>

            <p className="text-lg text-white/50 mb-10 leading-relaxed max-w-lg">
              Milhares de produtos com os melhores preços, entrega rápida e pagamento seguro.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="aloe" size="xl" asChild>
                <Link href="/products">
                  Ver produtos <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline-white" size="xl" asChild>
                <Link href="/orders">Meus pedidos</Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 mt-12 text-sm text-white/30">
              <span>+12k clientes satisfeitos</span>
              <span className="h-px w-8 bg-white/20" />
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-[#c1fbd4] text-[#c1fbd4]" />
                <span className="text-white/60 font-medium">4.9</span> avaliação
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features bar */}
      <section className="border-b border-[#e4e4e7] bg-white">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 py-2">
                <div className="h-9 w-9 rounded-full bg-[#f4f4f5] flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-black" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-[#71717a]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container pb-16 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-medium tracking-widest text-[#71717a] uppercase mb-2">Destaques</p>
            <h2 className="text-3xl font-light tracking-tight">Produtos em alta</h2>
          </div>
          <Link href="/products" className="text-sm text-[#71717a] hover:text-black transition-colors flex items-center gap-1">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => addItem({ id: product.id, name: product.name, price: product.price, currency: product.currency })}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e4e4e7] p-16 text-center">
            <p className="text-[#71717a] font-medium">API desconectada — inicie os serviços com</p>
            <code className="text-sm bg-[#f4f4f5] px-3 py-1.5 rounded-lg mt-2 inline-block font-mono">docker-compose up</code>
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
        <div className="relative overflow-hidden rounded-3xl bg-black text-white px-10 py-14 md:px-16">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[#c1fbd4]/5 rounded-l-full -translate-x-8" />
          <div className="relative max-w-lg">
            <p className="text-xs font-medium tracking-widest text-[#9dabad] uppercase mb-4">Oferta de boas-vindas</p>
            <h2 className="text-4xl font-light tracking-tight mb-3">Primeira compra?</h2>
            <p className="text-white/50 text-base mb-8 leading-relaxed">
              Use o código <strong className="text-white font-medium">BEMVINDO</strong> e ganhe 15% de desconto no seu primeiro pedido.
            </p>
            <Button variant="aloe" size="lg" asChild>
              <Link href="/products">Comprar agora <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
