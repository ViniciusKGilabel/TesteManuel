import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-24', className)}>
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#f4f4f5] mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-lg mb-1">{title}</h3>
      {description && <p className="text-[#71717a] text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
