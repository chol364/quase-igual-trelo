import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,25,40,0.88),rgba(9,15,27,0.82))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl',
        className
      )}
      {...props}
    />
  )
}
