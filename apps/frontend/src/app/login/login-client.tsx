'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/authClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess('');

    if (!email || !password) {
      setErrorMsg('Preencha todos os campos.');
      return;
    }
    if (mode === 'register' && !name) {
      setErrorMsg('Informe seu nome.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { data, error } = await authClient.signIn.email({ email, password });
        if (error) { setErrorMsg(error.message ?? 'Erro ao fazer login.'); return; }
        // Store Bearer token so Apollo Client can include it in GraphQL gateway requests
        if (data?.token) localStorage.setItem('auth_token', data.token);
        setSuccess('Login realizado! Redirecionando...');
        setTimeout(() => { window.location.href = '/'; }, 1200);
      } else {
        const { error } = await authClient.signUp.email({ email, password, name });
        if (error) { setErrorMsg(error.message ?? 'Erro ao criar conta.'); return; }
        setSuccess('Conta criada! Faça o login para continuar.');
        setMode('login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-20 right-10 w-64 h-64 bg-orange-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-rose-500 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            Manuel<span className="text-orange-400">Shop</span>
          </Link>
        </div>
        <div className="relative space-y-4">
          <blockquote className="text-3xl font-bold leading-snug">
            "A melhor experiência de compra online, do início ao fim."
          </blockquote>
          <p className="text-zinc-400">BetterAuth · GraphQL Federation · DDD · Next.js 15</p>
        </div>
        <div className="relative flex items-center gap-4 text-sm text-zinc-400">
          <div className="flex -space-x-2">
            {['from-orange-400 to-rose-500', 'from-violet-400 to-purple-600', 'from-emerald-400 to-teal-500'].map((g, i) => (
              <div key={i} className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} border-2 border-zinc-900`} />
            ))}
          </div>
          <span>+12.000 clientes confiam em nós</span>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
            </h1>
            <p className="text-muted-foreground mt-1.5">
              {mode === 'login'
                ? 'Entre na sua conta para continuar comprando.'
                : 'Crie sua conta e comece a explorar nosso catálogo.'}
            </p>
          </div>

          <div className="flex rounded-xl border p-1 mb-6 bg-muted">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrorMsg(''); setSuccess(''); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  mode === m ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Senha</label>
                {mode === 'login' && (
                  <button type="button" className="text-xs text-orange-500 hover:underline">
                    Esqueci a senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive">
                {errorMsg}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <Button type="submit" variant="brand" size="xl" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>Não tem conta?{' '}
                <button onClick={() => setMode('register')} className="text-orange-500 font-medium hover:underline">
                  Cadastre-se grátis
                </button>
              </>
            ) : (
              <>Já tem uma conta?{' '}
                <button onClick={() => setMode('login')} className="text-orange-500 font-medium hover:underline">
                  Entrar
                </button>
              </>
            )}
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os{' '}
            <span className="underline cursor-pointer">Termos de Serviço</span> e{' '}
            <span className="underline cursor-pointer">Política de Privacidade</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
