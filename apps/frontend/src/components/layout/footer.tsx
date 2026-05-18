import Link from 'next/link';
import { Github, Twitter, Instagram } from 'lucide-react';

const COLS = [
  {
    heading: 'Loja',
    links: [
      { label: 'Produtos', href: '/products' },
      { label: 'Novidades', href: '/products' },
      { label: 'Mais vendidos', href: '/products' },
      { label: 'Ofertas', href: '/products' },
    ],
  },
  {
    heading: 'Conta',
    links: [
      { label: 'Entrar', href: '/login' },
      { label: 'Cadastrar', href: '/login' },
      { label: 'Meus Pedidos', href: '/orders' },
    ],
  },
  {
    heading: 'Suporte',
    links: [
      { label: 'Central de ajuda', href: '#' },
      { label: 'Rastrear pedido', href: '#' },
      { label: 'Devoluções', href: '#' },
      { label: 'Contato', href: '#' },
    ],
  },
];

const SOCIALS = [
  { label: 'GitHub', Icon: Github },
  { label: 'Twitter', Icon: Twitter },
  { label: 'Instagram', Icon: Instagram },
] as const;

export function Footer() {
  return (
    <footer className="bg-black text-white border-t border-white/10">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link
              href="/"
              className="font-light text-xl tracking-wide text-white hover:opacity-80 transition-opacity inline-block"
              style={{ fontFeatureSettings: '"ss03"' }}
            >
              Manuel<span className="font-normal">Shop</span>
            </Link>
            <p className="text-sm leading-relaxed text-[#9dabad]">
              Plataforma de e-commerce moderna com GraphQL Federation, DDD e arquitetura de microsserviços.
            </p>
            <div className="flex gap-3 pt-1">
              {SOCIALS.map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className="h-8 w-8 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-medium text-white mb-4">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-[#9dabad] hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#52525b]">
          <p>© 2025 ManuelShop. Todos os direitos reservados.</p>
          <p>Powered by GraphQL Federation · DDD · Next.js 15</p>
        </div>
      </div>
    </footer>
  );
}
