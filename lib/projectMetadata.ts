import { parseDocument } from 'htmlparser2'
import { findAll, removeElement, textContent } from 'domutils'
import type { Metadata } from 'next'
import { buildSocialMetadata } from '@/lib/socialMetadata'

type ProjectMetadataInput = {
  name: string
  slug: string
  city?: string | null
  description?: string | null
  coverImage?: string | null
  socialImages?: Array<string | null | undefined>
}

export function normalizeProjectDescription(description: string | null | undefined, name: string, city?: string | null) {
  const parsed = parseDocument(description || '')
  findAll((node) => node.name === 'script' || node.name === 'style', parsed.children).forEach(removeElement)
  const plainText = textContent(parsed).replace(/\s+/g, ' ').trim()
  if (!plainText) return `Explore ${name}${city ? ` in ${city}` : ''}.`

  const characters = Array.from(plainText)
  return characters.length > 160 ? `${characters.slice(0, 157).join('')}...` : plainText
}

export function buildProjectMetadata(project: ProjectMetadataInput): Metadata {
  const title = `${project.name}${project.city ? ` in ${project.city}` : ''} | MillionFlats`
  const description = normalizeProjectDescription(project.description, project.name, project.city)
  const canonical = `/projects/${encodeURIComponent(project.slug)}`

  return {
    title,
    description,
    alternates: { canonical },
    ...buildSocialMetadata({
      title,
      description,
      url: canonical,
      type: 'website',
      image: project.socialImages || project.coverImage,
      imageAlt: title,
    }),
  }
}

export function buildMissingProjectMetadata(): Metadata {
  return {
    title: 'Project Not Found | MillionFlats',
    description: 'This project is unavailable.',
    robots: { index: false, follow: true },
  }
}