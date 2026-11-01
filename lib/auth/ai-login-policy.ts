import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAiLoginControlledRoute } from '@/lib/ai-public-routes'

export type AiInformationSearchParams = Record<
  string,
  string | string[] | undefined
>

export function resolveAiLoginRequired(value: unknown): boolean {
  return typeof value === 'boolean' ? value : true
}

export async function getAiInformationLoginRequired(): Promise<boolean> {
  try {
    const settings = await prisma.authSettings.findUnique({
      where: { id: 'singleton' },
      select: { aiInformationLoginRequired: true },
    })

    return resolveAiLoginRequired(settings?.aiInformationLoginRequired)
  } catch (error) {
    console.error('[ai-login-policy] Failed to load policy; requiring login.', error)
    return true
  }
}

function buildNextPath(
  pathname: string,
  searchParams?: AiInformationSearchParams,
): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === 'string') {
      query.append(key, value)
    } else if (Array.isArray(value)) {
      for (const entry of value) query.append(key, entry)
    }
  }

  const serializedQuery = query.toString()
  return serializedQuery ? `${pathname}?${serializedQuery}` : pathname
}

export async function requireAiInformationPageAccess(
  pathname: string,
  searchParams?: AiInformationSearchParams,
): Promise<void> {
  if (!isAiLoginControlledRoute(pathname)) return

  const loginRequired = await getAiInformationLoginRequired()
  if (!loginRequired) return

  const session = await getServerSession(authOptions)
  if (session?.user) return

  const nextPath = buildNextPath(pathname, searchParams)
  redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`)
}
