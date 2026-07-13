'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export function HeaderNav() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex items-center gap-2">
      {user ? (
        <>
          <span className="text-muted-foreground text-sm">{user.email}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Log out
          </Button>
        </>
      ) : (
        <Button asChild size="sm">
          <Link href="/login">Log in</Link>
        </Button>
      )}
    </nav>
  )
}
