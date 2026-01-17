/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com', 'api.reelly.io', 'reelly-backend.s3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
      { protocol: 'https', hostname: 'api.reelly.io', pathname: '/**' },
      { protocol: 'https', hostname: 'reelly-backend.s3.amazonaws.com', pathname: '/**' },
    ],
  },
  reactStrictMode: true,
}

module.exports = nextConfig

