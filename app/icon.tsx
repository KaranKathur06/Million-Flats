export const runtime = 'nodejs'

export default function Icon() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect x="0" y="0" width="64" height="64" rx="14" fill="#0B1020"/>
  <rect x="6" y="6" width="52" height="52" rx="12" fill="#0B1020" stroke="#D6B34A" stroke-width="2"/>
  <text x="32" y="39" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900" fill="#D6B34A">MF</text>
</svg>`

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
