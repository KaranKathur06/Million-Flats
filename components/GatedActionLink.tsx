'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

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
  const searchParams = useSearchParams()
  const { status } = useSession()

  const isAuthed = status === 'authenticated'

  const search = searchParams ? searchParams.toString() : ''

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAuthed) return
    e.preventDefault()
    const next = buildNext(pathname, search)
    router.push(`/user/login?next=${encodeURIComponent(next)}`)
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
