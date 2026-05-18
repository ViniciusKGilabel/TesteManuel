'use client';

import Link from 'next/link';
import { ShoppingBag, User, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/products', label: 'Produtos' },
  { href: '/blog', label: 'Blog' },
  { href: '/orders', label: 'Meus Pedidos' },
];

export function Navbar() {
  const { count, toggle } = useCart();
  const { user, isPending, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-black text-white border-b border-white/10">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="text-white font-light text-xl tracking-wide hover:opacity-80 transition-opacity"
            style={{ fontFeatureSettings: '"ss03"' }}
          >
            Manuel<span className="font-normal">Shop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isPending && user ? (
            <div className="flex items-center gap-1">
              <Link href="/orders">
                <Button variant="ghost-white" size="sm" className="hidden sm:flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
                  <User className="h-3.5 w-3.5" />
                  <span className="max-w-[100px] truncate">{user.email.split('@')[0]}</span>
                </Button>
              </Link>
              <Button variant="ghost-white" size="icon" onClick={logout} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline-white" size="sm" className="hidden sm:flex text-xs px-5">
                Entrar
              </Button>
            </Link>
          )}

          {/* Cart */}
          <button
            onClick={toggle}
            className={cn(
              'relative flex items-center justify-center h-9 w-9 rounded-full',
              'text-white/70 hover:text-white hover:bg-white/10 transition-colors'
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#c1fbd4] text-[9px] font-semibold text-black flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost-white"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm text-white/70 hover:text-white rounded-full hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline-white" size="sm" className="mt-2 w-full">
                Entrar
              </Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
