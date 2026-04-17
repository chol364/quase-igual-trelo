import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('mescla classes utilitárias', () => {
    expect(cn('px-2', 'py-4', 'px-6')).toContain('px-6')
  })
})
