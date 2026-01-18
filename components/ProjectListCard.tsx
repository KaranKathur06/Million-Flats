'use client'

import Image from 'next/image'
import Link from 'next/link'
import { memo, useMemo, useState } from 'react'
import { buildProjectSeoPath } from '@/lib/seo'

export type ReellyProject = {
  id: number
  name: string
  developer: string
  sale_status: 'on_sale' | 'out_of_stock'
  construction_status: 'completed' | 'under_construction'
  completion_date: string
  min_price: number
  max_price: number
  location: {
    country: number
    region: string
    district: string
    sector: string
  }
  cover_image?: {
    url?: string
  }
}

function formatAed(amount: number) {
  return AED_FORMATTER.format(amount)
}

const AED_FORMATTER = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
})

function formatCompletionDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-AE', { year: 'numeric', month: 'short' })
}

function ProjectListCardInner({ project }: { project: ReellyProject }) {
  const [imgErrored, setImgErrored] = useState(false)

  const canOptimizeUrl = useMemo(() => {
    const src = project.cover_image?.url || ''
    if (!src.startsWith('http')) return true
    try {
      const u = new URL(src)
      return u.hostname === 'api.reelly.io' || u.hostname === 'reelly-backend.s3.amazonaws.com' || u.hostname === 'images.unsplash.com'
    } catch {
      return false
    }
  }, [project.cover_image?.url])

  const imageUrl = useMemo(() => {
    const raw = project.cover_image?.url || ''
    if (imgErrored) return '/image-placeholder.svg'
    return raw || '/image-placeholder.svg'
  }, [imgErrored, project.cover_image?.url])

  const unoptimized = useMemo(() => imageUrl.startsWith('http') && !canOptimizeUrl, [canOptimizeUrl, imageUrl])

  const constructionBadge = project.construction_status === 'completed' ? 'Completed' : 'Under Construction'

  const locationLabel = [project.location?.district, project.location?.region].filter(Boolean).join(', ')

  const seoHref =
    buildProjectSeoPath({
      id: project.id,
      name: project.name,
      region: project.location?.region,
      district: project.location?.district,
      sector: project.location?.sector,
    }) || `/properties/${project.id}`

  const priceLabel =
    typeof project.min_price === 'number' && project.min_price > 0
      ? `From ${formatAed(project.min_price)}`
      : 'Price on request'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative aspect-[16/9]">
        <Image
          src={imageUrl}
          alt={project.name}
          width={800}
          height={450}
          className="h-full w-full object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={unoptimized}
          loading="lazy"
          onError={() => setImgErrored(true)}
        />

        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-700">
            {constructionBadge}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-dark-blue truncate">{project.name}</h3>
            <p className="mt-1 text-sm text-gray-600 truncate">{project.developer}</p>
            <p className="mt-2 text-sm text-gray-600">{locationLabel}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-dark-blue">{priceLabel}</p>
            <p className="mt-1 text-xs text-gray-500">Completion: {formatCompletionDate(project.completion_date)}</p>
          </div>
        </div>

        <Link
          href={seoHref}
          className="mt-4 inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

export default memo(ProjectListCardInner)
