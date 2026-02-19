'use client'

import { useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatCountryPrice } from '@/lib/country'
import { resolvePropertyImages } from '@/lib/propertyImages'
import { buildPropertySlugPath } from '@/lib/seo'

function canOptimizeUrl(src: string) {
  if (!src.startsWith('http')) return true
  try {
    const u = new URL(src)
    return u.hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

interface Agent {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
}

interface Property {
  id: string
  country: 'UAE' | 'India'
  title: string
  location: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  images: string[]
  featured: boolean
  propertyType: string
  agent?: Agent
}

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffleWithSeed<T>(items: T[], seed: string) {
  const arr = [...items]
  let s = hashString(seed)
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

export default function PropertyListCard({ property }: { property: Property }) {
  const href = buildPropertySlugPath({ id: property.id, title: property.title }) || `/properties/${property.id}`
  const baseImages = useMemo(
    () =>
      resolvePropertyImages({
        propertyType: property.propertyType,
        images: property.images,
        seed: property.id,
      }),
    [property.id, property.propertyType, property.images]
  )

  const sessionSeed = useRef(Math.random().toString(36).slice(2)).current

  const resolvedImages = useMemo(() => {
    const imgs = baseImages || []
    const shouldShuffle = imgs.length > 1 && imgs.every((src: string) => src.startsWith('/'))
    if (!shouldShuffle) return imgs
    return shuffleWithSeed(imgs, `${property.id}:${sessionSeed}`)
  }, [baseImages, property.id, sessionSeed])

  const mainImage = resolvedImages?.[0] || '/image-placeholder.svg'
  const unoptimizedMain = mainImage.startsWith('http') && !canOptimizeUrl(mainImage)

  const thumbs = (resolvedImages || []).slice(1, 4)
  const unoptimizedThumbs = thumbs.map((src: string) => src.startsWith('http') && !canOptimizeUrl(src))

  const phone = property.agent?.phone || ''
  const whatsappNumber = phone.replace(/[^\d]/g, '')
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="md:hidden">
        <div className="relative aspect-[4/3]">
          <Image
            src={mainImage}
            alt={property.title}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={unoptimizedMain}
            loading="lazy"
          />
          {property.featured && (
            <div className="absolute top-3 left-3 bg-accent-yellow text-dark-blue px-3 py-1 rounded-full text-xs font-semibold">
              Featured
            </div>
          )}
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-dark-blue border border-white/60">
            Agent Listing
          </div>
        </div>

        <div className="p-4">
          <p className="text-2xl font-bold text-dark-blue leading-tight">
            {formatCountryPrice(property.country, property.price)}
          </p>
          <h3
            className="mt-2 text-base font-semibold text-dark-blue"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {property.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">{property.location}, {property.country}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 rounded-xl py-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10V7a2 2 0 012-2h12a2 2 0 012 2v3M3 17h18M5 17v2m14-2v2M4 10h16v7H4v-7z" />
              </svg>
              <span className="font-semibold text-gray-800">{property.bedrooms}</span>
              <span className="text-gray-500">Beds</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 rounded-xl py-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4m-1 0H8m-3 0h14l-1 9H6l-1-9z" />
              </svg>
              <span className="font-semibold text-gray-800">{property.bathrooms}</span>
              <span className="text-gray-500">Baths</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 rounded-xl py-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M7 3v18M17 3v18" />
              </svg>
              <span className="font-semibold text-gray-800">{Math.round(property.squareFeet).toLocaleString()}</span>
              <span className="text-gray-500">Sq Ft</span>
            </div>
          </div>

          <Link
            href={href}
            className="mt-4 inline-flex items-center justify-center w-full h-12 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="relative aspect-[4/3]">
            <Image
              src={mainImage}
              alt={property.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              unoptimized={unoptimizedMain}
              loading="lazy"
            />
            {property.featured && (
              <div className="absolute top-4 left-4 bg-accent-yellow text-dark-blue px-3 py-1 rounded-full text-xs font-semibold">
                Featured
              </div>
            )}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-dark-blue border border-white/60">
              Agent Listing
            </div>
          </div>
          {thumbs.length > 0 && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 border-t border-gray-200">
              {thumbs.map((src: string, idx: number) => (
                <div key={idx} className="relative h-20 rounded-lg overflow-hidden">
                  <Image
                    src={src}
                    alt={property.title}
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized={unoptimizedThumbs[idx]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 p-6 lg:p-7">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-bold text-dark-blue leading-tight">
                  {formatCountryPrice(property.country, property.price)}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-dark-blue truncate">{property.title}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {property.location}, {property.country}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {property.propertyType}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {property.bedrooms} Beds · {property.bathrooms} Baths · {property.squareFeet.toLocaleString()} Sq Ft
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10V7a2 2 0 012-2h12a2 2 0 012 2v3M3 17h18M5 17v2m14-2v2M4 10h16v7H4v-7z" />
                </svg>
                <span className="font-medium">{property.bedrooms} Beds</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4m-1 0H8m-3 0h14l-1 9H6l-1-9z" />
                </svg>
                <span className="font-medium">{property.bathrooms} Baths</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M7 3v18M17 3v18" />
                </svg>
                <span className="font-medium">{property.squareFeet.toLocaleString()} Sq Ft</span>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a
                href={phone ? `tel:${phone}` : undefined}
                className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-gray-100 text-dark-blue font-semibold hover:bg-gray-200 transition-colors"
              >
                Call
              </a>
              <a
                href={whatsappHref || undefined}
                target={whatsappHref ? '_blank' : undefined}
                rel={whatsappHref ? 'noreferrer' : undefined}
                className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-gray-100 text-dark-blue font-semibold hover:bg-gray-200 transition-colors"
              >
                WhatsApp
              </a>
              <Link
                href={href}
                className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
