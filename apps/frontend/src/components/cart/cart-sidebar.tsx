'use client';

import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

export function CartSidebar() {
  const { items, isOpen, close, removeItem, updateQty, total, count } = useCart();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={close}
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="font-semibold text-lg">Carrinho</span>
            {count > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
            <ShoppingBag className="h-16 w-16 opacity-20" />
            <p className="font-medium">Seu carrinho está vazio</p>
            <p className="text-sm text-center">Adicione produtos para começar</p>
            <Button variant="outline" size="sm" onClick={close}>
              Ver produtos
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 py-3 border-b last:border-0">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center text-2xl flex-shrink-0">
                    🛍️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-orange-500 font-semibold text-sm mt-0.5">
                      {formatPrice(item.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="h-6 w-6 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="h-6 w-6 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t space-y-3 bg-muted/30">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal ({count} {count === 1 ? 'item' : 'itens'})</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <Button variant="brand" size="xl" className="w-full">
                Finalizar pedido
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={close}>
                Continuar comprando
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
