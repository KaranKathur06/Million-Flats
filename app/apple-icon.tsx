export const runtime = 'nodejs'

export default function AppleIcon() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect x="0" y="0" width="180" height="180" rx="44" fill="#0B1020"/>
  <rect x="12" y="12" width="156" height="156" rx="38" fill="#0B1020" stroke="#D6B34A" stroke-width="4"/>
  <text x="90" y="110" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="900" fill="#D6B34A">MF</text>
</svg>`

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
