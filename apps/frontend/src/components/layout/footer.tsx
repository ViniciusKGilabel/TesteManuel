import Link from 'next/link';
import { Zap, Github, Twitter, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-24">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-lg">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span>Manuel<span className="text-orange-500">Shop</span></span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plataforma de e-commerce moderna com GraphQL Federation, DDD e arquitetura de microsserviços.
            </p>
            <div className="flex gap-3 pt-1">
              {[Github, Twitter, Instagram].map((Icon, i) => (
                <button key={i} className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Loja</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Produtos', 'Ofertas', 'Novidades', 'Mais vendidos'].map((item) => (
                <li key={item}>
                  <Link href="/products" className="hover:text-foreground transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Conta</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Entrar', 'Cadastrar', 'Meus Pedidos', 'Favoritos'].map((item) => (
                <li key={item}>
                  <Link href="/login" className="hover:text-foreground transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Central de ajuda', 'Rastrear pedido', 'Devoluções', 'Contato'].map((item) => (
                <li key={item}>
                  <span className="hover:text-foreground transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <p>© 2024 ManuelShop. Todos os direitos reservados.</p>
          <p>Powered by GraphQL Federation · DDD · Next.js 15</p>
        </div>
      </div>
    </footer>
  );
}
