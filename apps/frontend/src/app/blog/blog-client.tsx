'use client';

import { useQuery } from '@apollo/client/react';
import { BookOpen, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { GET_POSTS } from '@/graphql/queries/cms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Post {
  databaseId: number;
  title: string | null;
  excerpt: string | null;
  slug: string;
  date: string | null;
}

function PostCard({ post }: { post: Post }) {
  const date = post.date
    ? new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const excerpt = post.excerpt ? post.excerpt.replace(/<[^>]+>/g, '').trim() : null;

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="rounded-2xl border bg-white p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
        <div className="flex items-start justify-between gap-4 mb-3">
          <Badge variant="outline" className="text-xs shrink-0">
            <BookOpen className="h-3 w-3 mr-1" />
            Blog
          </Badge>
          {date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              <Calendar className="h-3 w-3" />
              {date}
            </span>
          )}
        </div>

        <h2 className="font-bold text-xl leading-snug group-hover:text-orange-500 transition-colors mb-2">
          {post.title ?? 'Sem título'}
        </h2>

        {excerpt && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-4">
            {excerpt}
          </p>
        )}

        <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-500 group-hover:gap-2 transition-all">
          Ler mais <ArrowRight className="h-4 w-4" />
        </span>
      </article>
    </Link>
  );
}

function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-6 space-y-3">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function BlogPage() {
  const { data, loading, error } = useQuery<{ posts: { nodes: Post[] } }>(GET_POSTS, {
    variables: { first: 12 },
  });

  const posts = data?.posts?.nodes ?? [];

  return (
    <div className="container py-10">
      <div className="mb-10">
        <p className="text-sm font-medium text-orange-500 mb-1">Conteúdo</p>
        <h1 className="text-4xl font-extrabold tracking-tight">Blog</h1>
        <p className="text-muted-foreground mt-2">Notícias, novidades e dicas da nossa loja.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="h-10 w-10 text-destructive/40 mx-auto mb-3" />
          <p className="font-medium text-destructive">WordPress não está acessível</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Suba o serviço com <code className="bg-muted px-1.5 py-0.5 rounded">docker-compose up wordpress</code>
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/products">Ver produtos</Link>
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <PostCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-24">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-muted mb-6">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <h3 className="font-bold text-xl mb-2">Nenhum post publicado ainda</h3>
          <p className="text-muted-foreground">Volte em breve para novidades.</p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.databaseId} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
