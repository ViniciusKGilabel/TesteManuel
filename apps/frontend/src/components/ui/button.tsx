import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // primary pill — black fill, white text
        default:         'bg-black text-white hover:bg-[#3f3f46]',
        // brand = default (backwards compat)
        brand:           'bg-black text-white hover:bg-[#3f3f46]',
        // outline on light canvas — black border, black text
        outline:         'border border-black bg-transparent text-black hover:bg-black/5',
        // outline on dark canvas — white border, white text
        'outline-white': 'border-2 border-white bg-transparent text-white hover:bg-white/10',
        // aloe pill — mint fill, black text (featured CTA on light)
        aloe:            'bg-[#c1fbd4] text-black hover:bg-[#a8f7c4]',
        // neutral secondary
        secondary:       'bg-[#d4d4d8] text-black hover:bg-[#a1a1aa]',
        // ghost on light
        ghost:           'bg-transparent text-black hover:bg-black/5',
        // ghost on dark canvas
        'ghost-white':   'bg-transparent text-white hover:bg-white/10',
        // destructive
        destructive:     'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link:            'bg-transparent text-black underline-offset-4 hover:underline p-0',
      },
      size: {
        default: 'h-9 px-6 py-2',
        sm:     'h-8 px-4 text-xs',
        lg:     'h-11 px-8 text-base',
        xl:     'h-12 px-10 text-base',
        icon:   'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
