'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

type Props = {
  href: string
  className?: string
  children: React.ReactNode
}

function buildNext(pathname: string, search: string) {
  const next = `${pathname}${search ? `?${search}` : ''}`
  return next
}

export default function GatedActionLink({ href, className, children }: Props) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const { status } = useSession()

  const [search, setSearch] = useState('')

  const isAuthed = status === 'authenticated'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.location.search || ''
    setSearch(raw.startsWith('?') ? raw.slice(1) : raw)
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAuthed) return
    e.preventDefault()
    const next = buildNext(pathname, search)
    router.push(`/auth/login?next=${encodeURIComponent(next)}`)
  }

  const isInternal = href.startsWith('/')

  if (isInternal) {
    return (
      <Link href={href} className={className} onClick={handleClick}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}
