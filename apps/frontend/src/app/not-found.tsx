import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-8xl font-extrabold text-muted-foreground/20">404</h1>
      <h2 className="text-2xl font-bold mt-4 mb-2">Página não encontrada</h2>
      <p className="text-muted-foreground mb-6">A página que você está procurando não existe ou foi movida.</p>
      <Link href="/" className="px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-[#3f3f46] transition-colors">
        Voltar ao início
      </Link>
    </div>
  );
}
