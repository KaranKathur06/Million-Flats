# City-Scoped Buy, Rent, and Projects Search and Hero

## Goal

Make Buy, Rent, and Projects city searches show inventory in the requested
canonical city and its explicitly associated nearby communities, with
city-relevant hero imagery.

## Existing context

Buy/Rent support `location` and `city` query parameters, while Projects uses
`city`. Hero banners are configured by city/category but currently fall back
to country/global banners. Search APIs use substring comparisons in some city
filters. `City` has a unique `(countryCode, name)` key and `Community` rows
belong to a City; older listings also store city/community as text.

## Design

- Preserve query-string route shapes:
  `/buy?city=…`, `/rent?city=…`, `/projects?city=…`; retain legacy
  `/buy?location=…` and `/rent?location=…` compatibility. Accept an optional
  `country` query parameter containing an ISO-3166-1 alpha-2 country code
  (case-insensitive on input, uppercase in canonical URLs); use the same
  parameter on all three routes.
- Resolve aliases by normalized exact city name within explicit country when
  present. Without country, use an unambiguous exact canonical city match. If
  the same city name is ambiguous across markets, do not guess or broaden the
  result set. Unknown input may exact-match legacy city text only; it must not
  use partial substring matching.
- Normalize aliases through the existing canonical-city utility and exact
  `(countryCode, City.name)` records. An explicit `country` wins; if the city
  does not exist in that country, return no results rather than silently
  switching markets. Without country, resolve only when exactly one canonical
  city matches across configured markets. Otherwise return no results and
  preserve the user's input for correction.
- If there is no exact canonical city match and no ambiguous canonical match,
  allow exact normalized matching against legacy listing city text, constrained
  to the explicit country when provided. Do not infer communities for a
  legacy-only match. If canonical matches are ambiguous, return no results and
  do not try legacy matching. Legacy-only matches may return inventory but
  use the base-category canonical and non-indexable city metadata.
- Use `City.communities` as the source of truth for nearby-area membership.
  Match both canonical city text and exact, case-insensitive associated
  community names across legacy city/community columns. Seed/map documented
  nearby areas Gift City and Shilaj to Ahmedabad as indicated by the supplied
  Ahmedabad results. Do not match similarly named areas in another city.
- Apply one shared location scope builder to Buy, Rent, and Projects result
  queries, result counts, sorting, pagination, developer filters, and hero
  candidate selection. Projects/developer cards shown for a city are derived
  only from published projects inside that city scope.
- Hero selection order: configured city/category banner; otherwise the first
  published project ordered by featured first, featuredOrder ascending,
  listingPriority ascending, createdAt descending, and ID ascending. Resolve
  its image using shared media precedence with fallback disabled, so a
  placeholder/default image does not count as usable project media. If there
  is no usable project image, use that project's linked developer banner; if
  none exists, use a neutral category fallback. Never use an unrelated
  city-specific banner.
- Preserve existing non-city behavior, filters, sorting, and pagination. For
  a resolved canonical city, provide city-specific title/description and a
  canonical query URL including normalized city and country. Unknown or
  ambiguous city values are not independently indexable and use the base
  category canonical. Keep legacy `location=` URLs functional while emitting
  normalized `city=` canonical URLs.
- Use the shared supplied image fallback for project cards as defined in the
  separate project-image-fallback spec.

## Acceptance and validation

- Ahmedabad can include explicitly mapped nearby areas such as Gift City and
  Shilaj; unrelated substring collisions and other cities remain excluded.
- Mumbai Buy, Rent, and Projects results, counts, and developer links use
  Mumbai plus its mapped communities.
- Country-qualified aliases resolve deterministically; ambiguous/unknown
  city input never broadens to arbitrary partial matches.
- City canonical metadata includes normalized city/country only for
  unambiguous canonical locations; unknown/ambiguous locations use the base
  category canonical.
- A configured city hero wins; otherwise only a published project/developer
  image in that city's result scope may be selected, followed by a neutral
  fallback.
- Non-city searches, filtering, sorting, pagination, and SEO metadata retain
  existing behavior.
- Add tests for alias/country resolution, community scope, cross-city
  exclusion, count/pagination consistency, developer scope, and hero
  precedence/tie-breaking.
