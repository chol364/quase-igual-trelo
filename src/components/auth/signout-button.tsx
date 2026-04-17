'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  return (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        void signOut({ callbackUrl: '/' })
      }}
    >
      Sair
    </Button>
  )
}
