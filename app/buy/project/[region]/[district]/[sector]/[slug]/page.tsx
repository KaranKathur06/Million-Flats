import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { parseIdFromSlug } from '@/lib/seo'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const id = parseIdFromSlug(params?.slug)
  if (!id) return { title: 'Project' }

  const project = await (prisma as any).project.findUnique({
    where: { id },
    select: { name: true, description: true },
  }).catch(() => null)

  return {
    title: project?.name ? `${project.name} | millionflats` : 'Project | millionflats',
    description: project?.description || undefined,
  }
}

export default async function BuyProjectSeoPage({
  params,
}: {
  params: { region: string; district: string; sector: string; slug: string }
}) {
  const id = parseIdFromSlug(params?.slug)
  if (!id) notFound()

  const project = await (prisma as any).project.findUnique({
    where: { id },
    select: { slug: true },
  }).catch(() => null)

  if (!project?.slug) notFound()

  redirect(`/projects/${encodeURIComponent(String(project.slug))}`)
}
