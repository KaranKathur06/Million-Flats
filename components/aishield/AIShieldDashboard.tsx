'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AIShieldHero } from './AIShieldHero'
import { AIShieldFeaturedBanner, type FeaturedProjectData } from './AIShieldFeaturedBanner'
import { AIShieldFiltersBar } from './AIShieldFiltersBar'
import { AIShieldProjectExplorer, type ExplorerProject } from './AIShieldProjectExplorer'
import { AIShieldProjectSummary, type AiShieldProjectDetail } from './AIShieldProjectSummary'
import { ComingSoonModules } from './ComingSoonModules'
import { VerixShieldSkeleton } from '@/components/skeletons/ProjectPageSkeletons'

const VerixShieldPanel = dynamic(
  () => import('@/components/verixshield/VerixShieldPanel').then((m) => m.VerixShieldPanel),
  { ssr: false, loading: () => <VerixShieldSkeleton /> }
)

export default function AIShieldDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const explorerRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)

  const [projects, setProjects] = useState<ExplorerProject[]>([])
  const [featuredProject, setFeaturedProject] = useState<FeaturedProjectData | null>(null)
  const [selectedProject, setSelectedProject] = useState<AiShieldProjectDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [discoveryMode, setDiscoveryMode] = useState(false)

  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [developerOptions, setDeveloperOptions] = useState<string[]>([])
  const [countryOptions, setCountryOptions] = useState<{ iso: string; label: string }[]>([])

  const [search, setSearch] = useState(searchParams?.get('q') || '')
  const [city, setCity] = useState(searchParams?.get('city') || '')
  const [developer, setDeveloper] = useState(searchParams?.get('developer') || '')
  const [country, setCountry] = useState(searchParams?.get('country') || '')
  const [bhk, setBhk] = useState(searchParams?.get('bhk') || '')
  const [goldenVisa, setGoldenVisa] = useState(searchParams?.get('goldenVisa') || '')
  const [budgetMin, setBudgetMin] = useState(searchParams?.get('budget_min') || '')
  const [budgetMax, setBudgetMax] = useState(searchParams?.get('budget_max') || '')
  const [aiStatus, setAiStatus] = useState(searchParams?.get('ai_status') || '')
  const [propertyType, setPropertyType] = useState(searchParams?.get('property_type') || '')
  const [completion, setCompletion] = useState(searchParams?.get('completion') || '')

  const selectedSlug = searchParams?.get('project') || ''
  const manualPropertyId = searchParams?.get('property') || ''
  const manualType = searchParams?.get('type') || 'MANUAL_PROPERTY'

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const updateUrl = useCallback(
    (slug: string) => {
      const params = new URLSearchParams()
      if (slug) params.set('project', slug)
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (city) params.set('city', city)
      if (developer) params.set('developer', developer)
      if (country) params.set('country', country)
      if (bhk) params.set('bhk', bhk)
      if (goldenVisa === 'true') params.set('goldenVisa', 'true')
      if (budgetMin) params.set('budget_min', budgetMin)
      if (budgetMax) params.set('budget_max', budgetMax)
      if (aiStatus) params.set('ai_status', aiStatus)
      if (propertyType) params.set('property_type', propertyType)
      if (completion) params.set('completion', completion)
      const qs = params.toString()
      router.replace(qs ? `/ai/shield?${qs}` : '/ai/shield', { scroll: false })
    },
    [debouncedSearch, city, developer, country, bhk, goldenVisa, budgetMin, budgetMax, aiStatus, propertyType, completion, router]
  )

  const clearFilters = useCallback(() => {
    setSearch('')
    setCity('')
    setDeveloper('')
    setCountry('')
    setBhk('')
    setGoldenVisa('')
    setBudgetMin('')
    setBudgetMax('')
    setAiStatus('')
    setPropertyType('')
    setCompletion('')
  }, [])

  useEffect(() => {
    fetch('/api/ai-shield/filters')
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return
        setCityOptions(json.cities || [])
        setDeveloperOptions(json.developers || [])
        setCountryOptions(json.countries || [])
      })
      .catch(() => {})
  }, [])

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-shield/projects?featured=true')
      const json = await res.json()
      if (json.success && json.project) {
        setFeaturedProject(json.project)
      }
    } catch {
      setFeaturedProject(null)
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (city) params.set('city', city)
      if (developer) params.set('developer', developer)
      if (country) params.set('country', country)
      if (bhk) params.set('bhk', bhk)
      if (goldenVisa === 'true') params.set('goldenVisa', 'true')
      if (budgetMin) params.set('budget_min', budgetMin)
      if (budgetMax) params.set('budget_max', budgetMax)
      if (aiStatus) params.set('ai_status', aiStatus)
      if (propertyType) params.set('property_type', propertyType)
      if (completion) params.set('completion', completion)

      const res = await fetch(`/api/ai-shield/projects?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message)

      setProjects(json.items || [])
      setDiscoveryMode(Boolean(json.discoveryMode))
      return json.items as ExplorerProject[]
    } catch {
      setProjects([])
      return []
    } finally {
      setLoadingList(false)
    }
  }, [debouncedSearch, city, developer, country, bhk, goldenVisa, budgetMin, budgetMax, aiStatus, propertyType, completion])

  const loadProjectDetail = useCallback(async (slug: string) => {
    if (!slug) return
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/ai-shield/projects?slug=${encodeURIComponent(slug)}`)
      const json = await res.json()
      if (json.success && json.project) {
        setSelectedProject(json.project)
      } else {
        setSelectedProject(null)
      }
    } catch {
      setSelectedProject(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatured()
  }, [fetchFeatured])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (manualPropertyId) return

    if (selectedSlug) {
      loadProjectDetail(selectedSlug)
      return
    }

    if (projects.length === 0) {
      if (featuredProject?.slug) {
        updateUrl(featuredProject.slug)
        loadProjectDetail(featuredProject.slug)
      }
      return
    }

    const defaultSlug =
      projects.find((p) => p.isAiFeatured)?.slug ||
      featuredProject?.slug ||
      projects[0]?.slug

    if (defaultSlug) {
      updateUrl(defaultSlug)
      loadProjectDetail(defaultSlug)
    }
  }, [selectedSlug, projects, manualPropertyId, featuredProject, loadProjectDetail, updateUrl])

  const selectProject = (slug: string) => {
    updateUrl(slug)
    loadProjectDetail(slug)
    dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeFiltersCount = useMemo(
    () =>
      [city, developer, country, bhk, goldenVisa, budgetMin, budgetMax, aiStatus, propertyType, completion, debouncedSearch].filter(
        Boolean
      ).length,
    [city, developer, country, bhk, goldenVisa, budgetMin, budgetMax, aiStatus, propertyType, completion, debouncedSearch]
  )

  const showManualProperty = Boolean(manualPropertyId) && !selectedSlug
  const displayFeatured = featuredProject || (selectedProject as FeaturedProjectData | null)

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <AIShieldHero onExplore={() => explorerRef.current?.scrollIntoView({ behavior: 'smooth' })} />

      <div className="container mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 space-y-6 pb-16">
        {/* Featured project */}
        {displayFeatured && !showManualProperty && (
          <AIShieldFeaturedBanner
            project={displayFeatured}
            onSelect={() => selectProject(displayFeatured.slug)}
            selected={selectedSlug === displayFeatured.slug}
          />
        )}
      </div>

      <AIShieldFiltersBar
        search={search}
        onSearchChange={setSearch}
        city={city}
        onCityChange={setCity}
        developer={developer}
        onDeveloperChange={setDeveloper}
        country={country}
        onCountryChange={setCountry}
        aiStatus={aiStatus}
        onAiStatusChange={setAiStatus}
        propertyType={propertyType}
        onPropertyTypeChange={setPropertyType}
        completion={completion}
        onCompletionChange={setCompletion}
        goldenVisa={goldenVisa}
        onGoldenVisaChange={setGoldenVisa}
        cityOptions={cityOptions}
        developerOptions={developerOptions}
        countryOptions={countryOptions}
        activeFiltersCount={activeFiltersCount}
        onClear={clearFilters}
      />

      <div className="container mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div ref={explorerRef}>
          <AIShieldProjectExplorer
            projects={projects}
            selectedSlug={selectedSlug}
            onSelect={selectProject}
            loading={loadingList}
            discoveryMode={discoveryMode}
          />
        </div>

        <div ref={dashboardRef} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">AI Intelligence Dashboard</h2>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {showManualProperty ? (
            <VerixShieldPanel
              propertyId={manualPropertyId}
              entityType={manualType === 'PROJECT' ? 'PROJECT' : 'MANUAL_PROPERTY'}
              variant="dashboard"
              showHeader
            />
          ) : loadingDetail && !selectedProject ? (
            <VerixShieldSkeleton />
          ) : selectedProject ? (
            <>
              <AIShieldProjectSummary project={selectedProject} />
              <VerixShieldPanel
                key={selectedProject.id}
                propertyId={selectedProject.id}
                entityType="PROJECT"
                variant="dashboard"
                showHeader={false}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <p className="text-gray-600">Select a project above to load the full intelligence dashboard.</p>
            </div>
          )}
        </div>

        <ComingSoonModules />
      </div>
    </div>
  )
}
