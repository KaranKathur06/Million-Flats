'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCountry } from '@/components/CountryProvider'
import { COUNTRY_META, DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/country'
import {
  priceFilterOptions,
} from '@/lib/filters/dropdownOptions'

type Property = any

type Filters = {
  country: CountryCode
  search: string
  region: string
  location: string
  community: string
  type: string
  minPrice: string
  maxPrice: string
  bedrooms: string
  bathrooms: string
  sortBy: string
  offPlanOnly: boolean
  readyHomesOnly: boolean
  soldOnly: boolean
  features: string[]
}

type Purpose = 'buy' | 'rent'

function safePurpose(v: unknown): Purpose {
  return v === 'rent' ? 'rent' : 'buy'
}

export default function useProperties(forcedPurpose?: Purpose) {
  const searchParams = useSearchParams()
  const { country, setCountry } = useCountry()

  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(24)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const restoringUrlRef = useRef(false)
  const [locationOptions, setLocationOptions] = useState<{ states: string[]; cities: string[]; localities: string[] }>({ states: [], cities: [], localities: [] })

  const [purposeState, setPurposeState] = useState<Purpose>(() => {
    if (forcedPurpose) return forcedPurpose
    const fromUrl = searchParams?.get('purpose')
    return safePurpose(fromUrl)
  })

  const purpose = forcedPurpose ?? purposeState

  const setPurpose = (next: Purpose) => {
    if (forcedPurpose) return
    setPurposeState(next)
  }

  const getParam = useCallback((key: string) => searchParams?.get(key) ?? '', [searchParams])

  const initialCountry = useMemo(() => {
    const fromUrl = getParam('country')
    if (fromUrl && isCountryCode(fromUrl)) return fromUrl
    return country || DEFAULT_COUNTRY
  }, [country, getParam])

  const [filters, setFilters] = useState<Filters>({
    country: initialCountry,
    search: getParam('q'),
    region: getParam('state') || getParam('region'),
    location: getParam('location'),
    community: getParam('locality') || getParam('community'),
    type: getParam('type'),
    minPrice: getParam('minPrice') || COUNTRY_META[initialCountry].minPrice.toString(),
    maxPrice: getParam('maxPrice') || COUNTRY_META[initialCountry].maxPrice.toString(),
    bedrooms: getParam('bedrooms'),
    bathrooms: getParam('bathrooms'),
    sortBy: getParam('sortBy') || 'recommended',
    offPlanOnly: false,
    readyHomesOnly: false,
    soldOnly: false,
    features: [],
  })

  const [draftFilters, setDraftFilters] = useState<Filters>(filters)

  const syncUrl = useCallback((nextFilters: Filters, nextPurpose: Purpose) => {
    const params = new URLSearchParams(window.location.search)
    params.set('purpose', nextPurpose)

    params.set('country', nextFilters.country)
    if (nextFilters.search) params.set('q', nextFilters.search)
    else params.delete('q')
    if (nextFilters.location) params.set('location', nextFilters.location)
    else params.delete('location')
    if (nextFilters.region) params.set('state', nextFilters.region)
    else params.delete('state')
    params.delete('region')
    if (nextFilters.community) params.set('community', nextFilters.community)
    else params.delete('community')
    if (nextFilters.type) params.set('type', nextFilters.type)
    else params.delete('type')

    if (nextFilters.minPrice) params.set('minPrice', nextFilters.minPrice)
    else params.delete('minPrice')
    if (nextFilters.maxPrice) params.set('maxPrice', nextFilters.maxPrice)
    else params.delete('maxPrice')
    if (nextFilters.bedrooms) params.set('bedrooms', nextFilters.bedrooms)
    else params.delete('bedrooms')
    if (nextFilters.bathrooms) params.set('bathrooms', nextFilters.bathrooms)
    else params.delete('bathrooms')
    if (nextFilters.sortBy) params.set('sortBy', nextFilters.sortBy)
    else params.delete('sortBy')

    const nextUrl = `${window.location.pathname}?${params.toString()}`
    if (restoringUrlRef.current) {
      restoringUrlRef.current = false
    } else if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState(null, '', nextUrl)
    }
  }, [])

  useEffect(() => {
    const restoreFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      restoringUrlRef.current = true
      setFilters((previous) => ({
        ...previous,
        search: params.get('q') || '',
        region: params.get('state') || params.get('region') || '',
        location: params.get('location') || params.get('city') || '',
        community: params.get('community') || '',
        type: params.get('type') || params.get('propertyType') || '',
        minPrice: params.get('minPrice') || '',
        maxPrice: params.get('maxPrice') || '',
        bedrooms: params.get('bedrooms') || '',
        bathrooms: params.get('bathrooms') || '',
        sortBy: params.get('sortBy') || 'recommended',
      }))
      setDraftFilters((previous) => ({
        ...previous,
        search: params.get('q') || '',
        region: params.get('state') || params.get('region') || '',
        location: params.get('location') || params.get('city') || '',
        community: params.get('community') || '',
        type: params.get('type') || params.get('propertyType') || '',
        minPrice: params.get('minPrice') || '',
        maxPrice: params.get('maxPrice') || '',
        bedrooms: params.get('bedrooms') || '',
        bathrooms: params.get('bathrooms') || '',
        sortBy: params.get('sortBy') || 'recommended',
      }))
      setPage(1)
    }

    window.addEventListener('popstate', restoreFromUrl)
    return () => window.removeEventListener('popstate', restoreFromUrl)
  }, [])

  useEffect(() => {
    syncUrl(filters, purpose)
  }, [filters, purpose, syncUrl])

  useEffect(() => {
    if (!forcedPurpose) return
    setPurposeState(forcedPurpose)
  }, [forcedPurpose])

  useEffect(() => {
    const fromUrl = getParam('country')
    if (fromUrl && isCountryCode(fromUrl) && fromUrl !== country) {
      setCountry(fromUrl)
    }
  }, [country, getParam, setCountry])

  useEffect(() => {
    if (filters.country !== country) {
      setFilters((prev) => ({
        ...prev,
        country,
        search: '',
        location: '',
        community: '',
        minPrice: COUNTRY_META[country].minPrice.toString(),
        maxPrice: COUNTRY_META[country].maxPrice.toString(),
      }))
    }
  }, [country, filters.country])

  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ country: filters.country })
    if (filters.region) params.set('region', filters.region)
    if (filters.location) params.set('city', filters.location)

    fetch(`/api/properties/locations?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((json) => {
        if (!controller.signal.aborted && json?.success) {
          setLocationOptions({
            states: Array.isArray(json.states) ? json.states : [],
            cities: Array.isArray(json.cities) ? json.cities : [],
            localities: Array.isArray(json.localities) ? json.localities : [],
          })
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [filters.country, filters.region, filters.location])

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const params = new URLSearchParams()

      params.set('country', filters.country)
      if (filters.search.trim()) params.set('q', filters.search.trim())
      if (filters.location) params.set('city', filters.location)
      if (filters.community) params.set('community', filters.community)
      if (filters.region) params.set('state', filters.region)
      if (filters.type) params.set('type', filters.type)
      if (filters.minPrice) params.set('minPrice', filters.minPrice)
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
      if (filters.bedrooms) params.set('bedrooms', filters.bedrooms)
      if (filters.bathrooms) params.set('bathrooms', filters.bathrooms)
      if (filters.offPlanOnly) params.set('constructionStatus', 'OFF_PLAN')
      if (filters.readyHomesOnly) params.set('constructionStatus', 'READY')
      if (filters.sortBy) params.set('sortBy', filters.sortBy === 'price-low' ? 'price-asc' : filters.sortBy === 'price-high' ? 'price-desc' : filters.sortBy)
      params.set('purpose', purpose)
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await fetch(`/api/properties?${params.toString()}`)
      const text = await res.text().catch(() => '')
      const json = text ? (JSON.parse(text) as any) : null

      if (!res.ok || !json?.success) {
        setProperties([])
        setApiError('Unable to load properties. Please try again later.')
        return
      }

      const items = Array.isArray(json?.items) ? (json.items as any[]) : []
      const total = typeof json?.totalCount === 'number' ? Number(json.totalCount) : null

      const mapped = items
        .map((item: any) => {
          const id = String(item?.id || '').trim()
          if (!id) return null

          const title = typeof item?.title === 'string' ? item.title : 'Property'
          const countryLabel: 'UAE' | 'INDIA' = item?.country === 'INDIA' ? 'INDIA' : 'UAE'
          const city = typeof item?.city === 'string' ? item.city : ''
          const community = typeof item?.community === 'string' ? item.community : ''
          const location = community ? `${city} · ${community}` : city

          const intentRaw = String(item?.intent || '').toUpperCase()
          const intent: 'BUY' | 'RENT' = intentRaw === 'RENT' ? 'RENT' : 'BUY'

          const images: string[] = Array.isArray(item?.images) ? item.images.map((v: any) => String(v || '')).filter(Boolean) : []

          const agentRaw = item?.agent
          const agent = agentRaw
            ? {
                id: String(agentRaw?.id || ''),
                name: String(agentRaw?.name || ''),
                email: String(agentRaw?.email || ''),
                phone: String(agentRaw?.phone || ''),
                avatar: typeof agentRaw?.avatar === 'string' ? agentRaw.avatar : undefined,
              }
            : undefined

          return {
            id,
            href: typeof item?.href === 'string' ? item.href : '',
            country: countryLabel,
            title,
            location,
            price: Number(item?.price || 0),
            currency: typeof item?.currency === 'string' ? item.currency : countryLabel === 'INDIA' ? 'INR' : 'AED',
            intent,
            city,
            community,
            constructionStatus: String(item?.constructionStatus || ''),
            status: String(item?.status || ''),
            bedrooms: Number(item?.bedrooms || 0),
            bathrooms: Number(item?.bathrooms || 0),
            squareFeet: Number(item?.squareFeet || 0),
            images,
            featured: Boolean(item?.featured),
            propertyType: String(item?.propertyType || 'Property'),
            agent,
          } as Property
        })
        .filter(Boolean) as Property[]

      setProperties((prev) => (page > 1 ? [...prev, ...mapped] : mapped))
      setTotalCount(total)
    } catch (e) {
      setProperties([])
      setApiError('Unable to load properties. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [filters.bathrooms, filters.bedrooms, filters.community, filters.country, filters.location, filters.region, filters.maxPrice, filters.minPrice, filters.type, filters.search, filters.offPlanOnly, filters.readyHomesOnly, filters.sortBy, purpose, page, limit])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  useEffect(() => {
    // when filters or purpose change, reset pagination
    setPage(1)
  }, [filters.country, filters.region, filters.location, filters.community, filters.type, filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms, filters.sortBy, purpose])

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    if (newFilters.country && newFilters.country !== country && isCountryCode(newFilters.country)) {
      const nextCountry = newFilters.country
      setCountry(nextCountry)
      setFilters({
        ...filters,
        ...newFilters,
        search: '',
        region: '',
        location: '',
        community: '',
        minPrice: COUNTRY_META[nextCountry].minPrice.toString(),
        maxPrice: COUNTRY_META[nextCountry].maxPrice.toString(),
      })
      return
    }

    const didRegionChange = newFilters.region !== undefined && newFilters.region !== filters.region
    const didLocationChange = newFilters.location !== undefined && newFilters.location !== filters.location
    const next: Filters = {
      ...filters,
      ...newFilters,
      location: didRegionChange ? '' : newFilters.location ?? filters.location,
      community: didRegionChange || didLocationChange ? '' : newFilters.community ?? filters.community,
    }
    setFilters(next)
  }

  const cities = locationOptions.cities
  const communities = locationOptions.localities

  const applyDraft = (nextDraft?: Partial<Filters>) => {
    handleFilterChange(nextDraft ? { ...draftFilters, ...nextDraft } : draftFilters)
  }

  const loadMore = () => {
    if (totalCount !== null && properties.length >= totalCount) return
    setPage((p) => p + 1)
  }

  const resetFilters = () => {
    const nextCountry = country || DEFAULT_COUNTRY
    const next: Filters = {
      country: nextCountry,
      search: '',
      region: '',
      location: '',
      community: '',
      type: '',
      minPrice: COUNTRY_META[nextCountry].minPrice.toString(),
      maxPrice: COUNTRY_META[nextCountry].maxPrice.toString(),
      bedrooms: '',
      bathrooms: '',
      sortBy: 'featured',
      offPlanOnly: false,
      readyHomesOnly: false,
      soldOnly: false,
      features: [],
    }

    setPurpose('buy')
    if (nextCountry !== country) setCountry(nextCountry)
    setFilters(next)
    setDraftFilters(next)
    setApiError('')
  }

  const priceOptions = useMemo(() => {
    const meta = COUNTRY_META[filters.country]
    const opts: number[] = []
    const step = meta.priceStep * 5
    for (let v = meta.minPrice; v <= meta.maxPrice && opts.length < 10; v += step) {
      opts.push(v)
    }
    if (opts[opts.length - 1] !== meta.maxPrice) opts.push(meta.maxPrice)
    return opts
  }, [filters.country])

  const minPriceDropdownOptions = useMemo(() => priceFilterOptions(priceOptions, COUNTRY_META[filters.country].currencyLabel, 'Min Price'), [priceOptions, filters.country])
  const maxPriceDropdownOptions = useMemo(() => priceFilterOptions(priceOptions, COUNTRY_META[filters.country].currencyLabel, 'Max Price'), [priceOptions, filters.country])
  const minPriceDrawerOptions = useMemo(() => priceFilterOptions(priceOptions, COUNTRY_META[filters.country].currencyLabel, 'Min'), [priceOptions, filters.country])
  const maxPriceDrawerOptions = useMemo(() => priceFilterOptions(priceOptions, COUNTRY_META[filters.country].currencyLabel, 'Max'), [priceOptions, filters.country])

  return {
    properties,
    loading,
    apiError,
    page,
    limit,
    totalCount,
    setPage,
    setLimit,
    filters,
    setFilters,
    draftFilters,
    setDraftFilters,
    purpose,
    setPurpose,
    applyDraft,
    resetFilters,
    fetchProperties,
    loadMore,
    priceOptions,
    minPriceDropdownOptions,
    maxPriceDropdownOptions,
    minPriceDrawerOptions,
    maxPriceDrawerOptions,
    cities,
    communities,
    states: locationOptions.states,
  }
}
