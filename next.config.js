/** @type {import('next').NextConfig} */

const defaultRemotePatterns = [
  { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
  { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
]

const defaultDomains = ['images.unsplash.com', 'via.placeholder.com']
defaultRemotePatterns.push({ protocol: 'https', hostname: 'millionflats-prod-assets.s3.eu-north-1.amazonaws.com', pathname: '/**' })
defaultDomains.push('millionflats-prod-assets.s3.eu-north-1.amazonaws.com')

const publicBase = String(process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || '').trim()
if (publicBase) {
  try {
    const parsed = new URL(publicBase)
    defaultRemotePatterns.push({ protocol: parsed.protocol.replace(':', ''), hostname: parsed.hostname, pathname: '/**' })
    defaultDomains.push(parsed.hostname)
  } catch {
    // Ignore invalid URL and continue with default domains.
  }
}

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
}

module.exports = nextConfig

