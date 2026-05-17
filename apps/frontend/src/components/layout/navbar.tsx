'use client';

import Link from 'next/link';
import { ShoppingBag, User, Search, Menu, X, Zap, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Início' },
  { href: '/products', label: 'Produtos' },
  { href: '/blog', label: 'Blog' },
  { href: '/orders', label: 'Meus Pedidos' },
];

export function Navbar() {
  const { count, toggle } = useCart();
  const { user, isPending, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span>Manuel</span>
            <span className="text-orange-500">Shop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-md hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Search className="h-4 w-4" />
          </Button>

          {!isPending && user ? (
            <div className="flex items-center gap-1">
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4" />
                  <span className="max-w-[100px] truncate">{user.email.split('@')[0]}</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={logout} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </Link>
          )}

          <button
            onClick={toggle}
            className={cn(
              'relative flex items-center justify-center h-9 w-9 rounded-md',
              'hover:bg-accent transition-colors'
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
