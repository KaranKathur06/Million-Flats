/** @type {import('next').NextConfig} */

const defaultRemotePatterns = [
  { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
  { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
]

const defaultDomains = ['images.unsplash.com', 'via.placeholder.com']

// CloudFront CDN domain — PRIMARY asset source
const cdnDomain = String(process.env.NEXT_PUBLIC_CDN_DOMAIN || process.env.CLOUDFRONT_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
if (cdnDomain) {
  defaultRemotePatterns.push({ protocol: 'https', hostname: cdnDomain, pathname: '/**' })
  defaultDomains.push(cdnDomain)
}

// S3 bucket domain — kept temporarily for legacy URLs still in transition
// TODO: Remove once DB normalization migration is complete
const s3Bucket = String(process.env.AWS_S3_BUCKET || '').trim()
const awsRegion = String(process.env.AWS_REGION || '').trim()
if (s3Bucket && awsRegion) {
  const s3Host = `${s3Bucket}.s3.${awsRegion}.amazonaws.com`
  defaultRemotePatterns.push({ protocol: 'https', hostname: s3Host, pathname: '/**' })
  defaultDomains.push(s3Host)
}

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    domains: Array.from(new Set(defaultDomains)),
    formats: ['image/avif', 'image/webp'],
    remotePatterns: defaultRemotePatterns,
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 3600,
  },
  reactStrictMode: true,
  eslint: {
    // Pre-existing warnings in legacy code — lint runs separately in CI
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // ── Verix → AI branding redirects (301 permanent) ──
      { source: '/verfix-system', destination: '/ai-system', permanent: true },
      { source: '/verix/view', destination: '/ai/view', permanent: true },
      { source: '/verix/shield', destination: '/ai/shield', permanent: true },
      { source: '/verix/index', destination: '/ai/index', permanent: true },
      { source: '/verix/title', destination: '/ai/title', permanent: true },
      { source: '/verix/pro', destination: '/ai/pro', permanent: true },
    ]
  },
}

module.exports = nextConfig

