import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(135deg,#2f86ff,#1f6bff)] text-white shadow-[0_14px_30px_rgba(31,107,255,0.35)] hover:-translate-y-0.5 hover:brightness-110',
        secondary:
          'border border-white/10 bg-white/[0.06] text-white hover:-translate-y-0.5 hover:bg-white/[0.1] hover:border-white/20',
        ghost:
          'bg-transparent text-white/80 hover:bg-white/8 hover:text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />
}
