# Public AI MVP Operations

The public AI pages rely on the following production deployment requirements:

- Configure `REDIS_URL` (or `REDIS`) for the shared, atomic anonymous request
  budgets. Anonymous requests fail with `503` when Redis is unavailable.
- The trusted ingress must remove any client-supplied `x-real-ip` header and
  overwrite it with the connecting client's validated IPv4 or IPv6 address.
  Do not forward a client-provided value as trusted metadata. Anonymous AI
  requests fail with `503` when this header is absent or malformed.
- Do not cache the public AI API responses at the CDN. Their `private,
  no-store` headers ensure requests reach the server and count against the
  per-engine budget. The AI engines may still reuse their internal result
  caches.

AITitle currently validates and downloads the submitted HTTPS document safely,
but its analysis engine is heuristic and does not perform OCR or inspect the
document contents. Do not present the result as document verification until
document extraction and analysis are implemented.
