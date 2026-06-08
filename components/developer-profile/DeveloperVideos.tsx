type DeveloperVideosProps = {
  youtubeUrl: string | null
  developerName: string
}

function extractYouTubeChannelEmbedUrl(url: string): string | null {
  // Support various YouTube URL formats
  try {
    const parsed = new URL(url)
    // Channel URL -> we can't embed a channel, so return null
    // Video URL -> embed
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v')
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }
    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.slice(1)
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }
  } catch {
    // Not a valid URL
  }
  return null
}

export default function DeveloperVideos({ youtubeUrl, developerName }: DeveloperVideosProps) {
  if (!youtubeUrl) return null

  const embedUrl = extractYouTubeChannelEmbedUrl(youtubeUrl)

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-gray-50">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Videos</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Watch {developerName}&apos;s latest project videos and walkthroughs.
          </p>
        </div>

        {embedUrl ? (
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <div className="relative aspect-video">
              <iframe
                src={embedUrl}
                title={`${developerName} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-500 mb-3">Visit {developerName}&apos;s YouTube channel for project videos.</p>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Watch on YouTube
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
