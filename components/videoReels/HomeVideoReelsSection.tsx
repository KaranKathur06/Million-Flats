'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Share2, Video } from 'lucide-react'

type ReelCardData = {
  id: string
  title: string
  caption: string | null
  videoUrl: string
  posterUrl: string | null
  durationMs: number | null
  sponsored: boolean
  destination: string | null
  deliveryToken: string | null
  source: 'SPONSORED' | 'ORGANIC' | 'HOUSE'
  projectPath?: string | null
}

type FeedResponse = {
  cards?: ReelCardData[]
  nextCursor?: string | null
  error?: string
}

function postCampaignEvent(token: string | null, event: Record<string, unknown>, keepalive = false) {
  if (!token) return Promise.resolve(false)
  return fetch('/api/video-campaigns/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, eventId: crypto.randomUUID(), ...event }),
    keepalive,
  }).then((response) => response.ok).catch(() => false)
}

function ReelCard({ reel }: { reel: ReelCardData }) {
  const cardRef = useRef<HTMLElement>(null)
  const impressionSent = useRef(false)
  const startSent = useRef(false)
  const pendingStart = useRef(false)
  const qualifiedSent = useRef(false)
  const completeSent = useRef(false)
  const pendingCompletionMs = useRef<number | null>(null)
  const startedAt = useRef<number | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const sendComplete = useCallback(async (playbackMs: number) => {
    if (!reel.sponsored || !reel.deliveryToken || completeSent.current || !reel.durationMs) return
    pendingCompletionMs.current = playbackMs
    if (startedAt.current === null) return
    const remainingMs = reel.durationMs - (Date.now() - startedAt.current)
    if (remainingMs > 0) {
      setTimeout(() => { void sendComplete(playbackMs) }, remainingMs + 100)
      return
    }
    completeSent.current = true
    await postCampaignEvent(reel.deliveryToken, { type: 'COMPLETE', playbackMs, mediaEnded: true })
  }, [reel.deliveryToken, reel.durationMs, reel.sponsored])

  const sendStart = useCallback(async () => {
    if (!reel.sponsored || !reel.deliveryToken || startSent.current) return
    const accepted = await postCampaignEvent(reel.deliveryToken, { type: 'START' })
    if (accepted) {
      startSent.current = true
      startedAt.current = Date.now()
      pendingStart.current = false
      if (pendingCompletionMs.current !== null) void sendComplete(pendingCompletionMs.current)
    }
  }, [reel.deliveryToken, reel.sponsored, sendComplete])

  useEffect(() => {
    if (!reel.sponsored || !reel.deliveryToken || !cardRef.current) return
    if (typeof IntersectionObserver === 'undefined') return
    const card = cardRef.current
    let visibleSince = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        visibleSince = Date.now()
        timer = setTimeout(async () => {
          if (impressionSent.current) return
          const visibleMs = Date.now() - visibleSince
          const accepted = await postCampaignEvent(reel.deliveryToken, {
            type: 'IMPRESSION',
            visibleRatio: entry.intersectionRatio,
            visibleMs,
          })
          if (accepted) {
            impressionSent.current = true
            if (pendingStart.current) void sendStart()
          }
        }, 1100)
      } else {
        visibleSince = 0
        if (timer) clearTimeout(timer)
      }
    }, { threshold: [0, 0.5, 1] })
    observer.observe(card)
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [reel.deliveryToken, reel.sponsored, sendStart])

  const handlePlay = () => {
    if (!reel.sponsored || !reel.deliveryToken || startSent.current) return
    if (impressionSent.current) void sendStart()
    else pendingStart.current = true
  }

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!reel.sponsored || !reel.deliveryToken || !startSent.current || startedAt.current === null) return
    const video = event.currentTarget
    const playbackMs = Math.min(60_000, Math.floor(video.currentTime * 1000))
    if (!qualifiedSent.current && playbackMs >= 10_000 && Date.now() - startedAt.current >= 10_000) {
      qualifiedSent.current = true
      void postCampaignEvent(reel.deliveryToken, { type: 'QUALIFIED_VIEW', playbackMs })
    }
  }

  const handleEnded = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!reel.sponsored || !reel.deliveryToken || completeSent.current) return
    void sendComplete(Math.min(60_000, Math.floor(event.currentTarget.currentTime * 1000)))
  }

  const handleShare = async () => {
    const shareData = { title: reel.title, text: reel.caption || reel.title, url: window.location.href }
    try {
      if (navigator.share) await navigator.share(shareData)
      else if (navigator.clipboard) await navigator.clipboard.writeText(shareData.url)
      else return
      if (reel.sponsored) {
        void postCampaignEvent(reel.deliveryToken, { type: 'ENGAGEMENT', shareActivated: true })
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Unable to share video reel', error)
      }
    }
  }

  const destination = reel.destination || reel.projectPath
  const handleDestinationClick = () => {
    if (reel.sponsored) {
      void postCampaignEvent(reel.deliveryToken, { type: 'CLICK', destinationActivated: true }, true)
    }
  }

  return (
    <article
      ref={cardRef}
      className="relative w-[min(78vw,290px)] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 bg-[#132943] shadow-xl sm:w-[290px]"
    >
      <div className="relative aspect-[9/16] bg-[#081626]">
        {!unavailable ? (
          <video
            className="h-full w-full object-cover"
            src={reel.videoUrl}
            poster={reel.posterUrl || undefined}
            controls
            playsInline
            preload="none"
            onPlay={handlePlay}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setUnavailable(true)}
            aria-label={reel.title}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
            <Video className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">This video is temporarily unavailable.</p>
          </div>
        )}
        {reel.sponsored ? (
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
            Sponsored
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4 text-white">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">{reel.title}</h3>
          {reel.caption ? <p className="mt-1 line-clamp-2 text-sm text-white/65">{reel.caption}</p> : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          {destination ? (
            <a
              href={destination}
              target={destination.startsWith('https://') ? '_blank' : undefined}
              rel={destination.startsWith('https://') ? 'noopener noreferrer' : undefined}
              onClick={handleDestinationClick}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#f2c56b] px-3 text-xs font-semibold text-[#12243a] transition hover:bg-[#ffda8c]"
            >
              Explore
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : <span />}
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={`Share ${reel.title}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

export default function HomeVideoReelsSection() {
  const [cards, setCards] = useState<ReelCardData[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const loadFeed = useCallback(async (cursor?: string) => {
    const isNextPage = Boolean(cursor)
    if (isNextPage) setLoadingMore(true)
    else setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/video-reels/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
        cache: 'no-store',
      })
      const data = await response.json() as FeedResponse
      if (!response.ok) throw new Error(data.error || 'Unable to load videos right now.')
      setCards((current) => cursor ? [...current, ...(data.cards || [])] : (data.cards || []))
      setNextCursor(data.nextCursor || null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load videos right now.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { void loadFeed() }, [loadFeed])

  if (!loading && !cards.length && !error) return null

  return (
    <section className="overflow-hidden bg-[#0d1f38] py-14 text-white sm:py-20" aria-labelledby="video-reels-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#f2c56b]">The MillionFlats reel</p>
            <h2 id="video-reels-heading" className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Discover property in motion
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
              Explore homes, neighbourhoods and the people shaping real estate.
            </p>
          </div>
          <div className="hidden items-center gap-2 text-sm text-white/55 sm:flex">
            <span className="h-px w-8 bg-white/25" />
            Swipe to explore
          </div>
        </div>

        {error && !cards.length ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">{error}</div>
        ) : null}

        {loading && !cards.length ? (
          <div className="flex gap-4 overflow-hidden" aria-label="Loading property videos">
            {[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[9/16] w-[min(78vw,290px)] shrink-0 animate-pulse rounded-3xl bg-white/10 sm:w-[290px]" />)}
          </div>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:mx-0 sm:gap-5 sm:px-0">
            {cards.map((reel) => <ReelCard key={`${reel.source}-${reel.id}-${reel.deliveryToken || ''}`} reel={reel} />)}
          </div>
        )}

        {nextCursor ? (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => void loadFeed(nextCursor)}
              disabled={loadingMore}
              className="min-h-11 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load more reels'}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
