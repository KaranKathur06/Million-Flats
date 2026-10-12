# Public AI Demo and Missing Property Image Design

## Goal

Let unauthenticated visitors, including prospective investors, open the AI
systems in the MVP demo without being sent to login. Use the user's second
attachment as the shared fallback image for properties and projects that do not
have an image.

## Scope

- Make `/ai/index`, `/ai/pro`, `/ai/shield`, `/ai/shield/about`, `/ai/title`,
  and `/ai/view` accessible without authentication, including direct URLs.
- Keep all `/api/ai/**` endpoints protected for anonymous visitors.
- Use static sample/demo data on public AI pages; do not fetch live AI API data
  or invoke analysis actions anonymously.
- Preserve authentication and authorization for buyer, agent, admin, account,
  and property/project management routes and operations.
- Use the second attachment (`Pasted Image 2.jpe` in the provided attachment
  directory) as the default when a property or project image value is missing,
  null, empty, or whitespace-only. Keep non-empty image values unchanged;
  broken non-empty URLs are outside this change.
- Apply the fallback consistently wherever properties and projects are shown;
  do not change unrelated image types such as user avatars.

## Design

### Public demo access

Update the existing middleware/access rules to exempt only the AI page routes
listed in Scope from the unauthenticated login redirect. Keep existing role
checks for administrative and management routes intact. Do not exempt
`/api/ai/**` or broadly exempt `/api/**` from authentication. Every method on
AI endpoints, including market, investment, valuation, agent, legal, vision,
and orchestration, remains protected.

AI pages should remain usable through navigation and direct links. For
unauthenticated visitors, show clearly labeled static/sample demo previews on
`/ai/index`, `/ai/pro`, `/ai/shield`, `/ai/title`, and `/ai/view`; do not fetch
AI APIs, invoke analysis actions, or redirect to login. `/ai/shield/about`
remains informational. Authenticated interactive behavior stays unchanged.

### Missing-image fallback

The source is
`C:\Users\kathu\AppData\Roaming\Code\agentSessionData\b9b2d296-975f-4651-925f-a68fe42a8cf1\attachments\c1808c0b-fc85-4cc0-92d2-529dcd6e6bf8\Pasted Image 2.jpe`;
it has PNG file contents despite the `.jpe` extension. Copy its bytes, without
modifying the read-only attachment, to
`public/images/property-project-placeholder.png`. Connect the fallback to
`lib/propertyImages.ts` and use it consistently in the current property/project
image surfaces: `PropertyCard`, `PropertyListCard`, `AgentListingCard`,
`ProjectsGridClient`, and `ProjectDetailClient`. Treat missing, null, empty, or
whitespace-only image values as absent; non-empty image values retain priority.
Broken non-empty URLs are outside this change. If implementation discovery
finds another property/project image surface, it must use the same resolver.

## Alternatives considered

1. Make all routes public: rejected because it would remove access control from
   unrelated user and management areas.
2. Change only AI navigation links: rejected because direct AI URLs would still
   redirect to login.
3. Public AI pages with static sample previews and protected APIs: selected
   because it enables investor visibility without exposing live or
   entity-linked data.

## Validation

- Verify an unauthenticated browser can open each listed AI page directly.
- Verify every anonymous request to `/api/ai/**` is rejected, while all listed
  public AI pages render without making AI API requests.
- Verify public visitors see the labeled sample previews without protected
  analysis requests or login redirects; verify authenticated interactive
  behavior remains unchanged.
- Verify authenticated role restrictions and non-AI protected routes remain
  unchanged.
- Verify all current property/project image surfaces (at minimum the five
  named surfaces) show the supplied fallback for missing, null, empty, or
  whitespace-only values, while supplied images continue to display.
- Run focused existing type checks, lint, or tests covering changed code.
