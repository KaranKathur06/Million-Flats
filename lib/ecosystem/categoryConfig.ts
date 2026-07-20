import type { EcosystemCategorySlug } from '../ecosystemPartners'

export type EcosystemBenefit = {
  title: string
  description: string
  icon?: 'shield' | 'sparkles' | 'clock' | 'star' | 'check'
}

export type EcosystemFaq = {
  question: string
  answer: string
}

export type EcosystemToolKey = 'home-loans' | 'property-management' | null

export type EcosystemSectionItem = {
  title: string
  description: string
}

export type EcosystemResourceLink = {
  title: string
  description: string
  href: string
}

export type EcosystemFeaturedSection = {
  title: string
  badge: string
  exploreHref?: string
}

export type EcosystemCategoryConfig = {
  slug: EcosystemCategorySlug
  title: string
  subtitle: string
  heroImage: { src: string; alt: string }
  meta: { title: string; description: string; ogImage?: string }
  primaryCta: { label: string }
  secondaryCta: { label: string }
  benefits: EcosystemBenefit[]
  overview?: string[]
  highlights?: EcosystemSectionItem[]
  workflow?: EcosystemSectionItem[]
  resources?: EcosystemResourceLink[]
  featuredSection?: EcosystemFeaturedSection
  faqs: EcosystemFaq[]
  tool: EcosystemToolKey
}

export const ECOSYSTEM_CATEGORY_CONFIG: Record<EcosystemCategorySlug, EcosystemCategoryConfig> = {
  'home-loans-finance': {
    slug: 'home-loans-finance',
    title: 'Home Loans & Finance',
    subtitle:
      'Compare lenders, understand affordability, and get matched with verified finance partners—built for a smooth, confident homebuying journey.',
    heroImage: { src: '/images/ecosystem/home-loans.jpg', alt: 'Home loans & finance' },
    meta: {
      title: 'Home Loans & Finance | Ecosystem Partners | MillionFlats',
      description:
        'Finance your dream home with confidence—discover curated lenders, check eligibility, compare offers, and apply through MillionFlats.',
      ogImage: '/images/ecosystem/home-loans.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Verified Partners', description: 'Curated lenders and advisors vetted for response quality and clarity.' },
      { title: 'Faster Approvals', description: 'Reduce back-and-forth with structured lead capture and matching.' },
      { title: 'Transparent Comparison', description: 'Compare options confidently with consistent partner profiles.' },
      { title: 'Guided Next Steps', description: 'Tools and checklists that help you decide before you commit.' },
    ],
    faqs: [
      { question: 'How quickly will I get a callback?', answer: 'Most requests are responded to within 24 hours (often faster during business hours).' },
      { question: 'Does MillionFlats charge for consultation?', answer: 'Requesting a consultation is free. Partner fees, if any, are explained upfront.' },
      { question: 'Can NRIs apply?', answer: 'Yes—select NRI-focused partners and share your profile for accurate matching.' },
    ],
    tool: 'home-loans',
  },
  'legal-documentation': {
    slug: 'legal-documentation',
    title: 'Legal & Documentation',
    subtitle:
      'Protect your transaction with verified legal support—due diligence, agreements, registration and compliance, all in one place.',
    heroImage: { src: '/images/ecosystem/legal.jpg', alt: 'Legal documentation support' },
    meta: {
      title: 'Legal & Documentation | Ecosystem Partners | MillionFlats',
      description:
        'Secure your property transaction with verified legal partners for due diligence, agreement drafting, and registration—only on MillionFlats.',
      ogImage: '/images/ecosystem/legal.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Vetted Expertise', description: 'Partners verified for real-estate specialization and professional standing.' },
      { title: 'Fixed-Fee Transparency', description: 'Clear pricing for common services with no hidden costs.' },
      { title: 'Secure Document Handling', description: 'Partners follow secure practices for document sharing and e-signing.' },
    ],
    faqs: [
      { question: 'What services are covered?', answer: 'Due diligence, agreement review, drafting, registration guidance, and more depending on your needs.' },
      { question: 'Can I speak to multiple partners?', answer: 'Yes—you can request consultations and compare before choosing.' },
    ],
    tool: null,
  },
  'property-insurance': {
    slug: 'property-insurance',
    title: 'Property Insurance',
    subtitle:
      'Get the right protection for your home or investment with verified providers, clear cover comparisons, and guidance you can trust.',
    heroImage: { src: '/images/ecosystem/insurance.jpg', alt: 'Property insurance' },
    meta: {
      title: 'Property Insurance | Ecosystem Partners | MillionFlats',
      description:
        'Find the right coverage for your home or investment with curated providers and clear, comparable policy summaries.',
      ogImage: '/images/ecosystem/insurance.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Verified Providers', description: 'Curated insurers and brokers focused on transparent policy guidance.' },
      { title: 'Smarter Coverage', description: 'Choose cover that fits your property type, location and risk profile.' },
      { title: 'Claim Support', description: 'Partners help you understand timelines and documentation before you buy.' },
    ],
    faqs: [
      { question: 'What does property insurance typically cover?', answer: 'Coverage varies by policy—partners will help you compare inclusions and exclusions.' },
    ],
    tool: null,
  },
  'interior-design-renovation': {
    slug: 'interior-design-renovation',
    title: 'Interior Design & Renovation',
    subtitle:
      'Transform your space with verified designers and renovation teams—premium execution, clear timelines, and confident budgeting.',
    heroImage: { src: '/images/ecosystem/interior.jpg', alt: 'Interior design and renovation' },
    meta: {
      title: 'Interior Design & Renovation | Ecosystem Partners | MillionFlats',
      description:
        'Get matched with vetted designers and renovation specialists to bring your dream space to life—on time and on budget.',
      ogImage: '/images/ecosystem/interior.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Curated Specialists', description: 'Designers vetted for quality, process, and project management.' },
      { title: 'Structured Proposals', description: 'Compare scope, budget bands and timelines with consistent partner profiles.' },
      { title: 'On-time Delivery', description: 'Partners optimized for coordination and predictable execution.' },
    ],
    faqs: [
      { question: 'Do partners support turnkey execution?', answer: 'Many do—share your requirements and we’ll match you accordingly.' },
    ],
    tool: null,
  },
  'packers-movers': {
    slug: 'packers-movers',
    title: 'Packers & Movers',
    subtitle:
      'Move with confidence—verified teams, careful handling, transparent pricing, and dependable delivery for local or long-distance relocation.',
    heroImage: { src: '/images/ecosystem/packers.jpg', alt: 'Packers and movers' },
    meta: {
      title: 'Packers & Movers | Ecosystem Partners | MillionFlats',
      description:
        'Relocate smoothly with verified professionals—transparent pricing, careful handling, and dependable delivery.',
      ogImage: '/images/ecosystem/packers.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Verified Teams', description: 'Shortlisted movers with strong customer feedback and clear terms.' },
      { title: 'Careful Handling', description: 'Packaging, labeling and protected transport to reduce damage risk.' },
      { title: 'Transparent Pricing', description: 'Know what’s included with fewer last-minute surprises.' },
    ],
    faqs: [
      { question: 'Do you support inter-city moves?', answer: 'Yes—select partners based on your origin/destination and requirements.' },
    ],
    tool: null,
  },
  'property-management': {
    slug: 'property-management',
    title: 'Property Management',
    subtitle:
      'Maximize returns with verified managers—tenanting, maintenance, reporting and hands-off ownership, built for peace of mind.',
    heroImage: { src: '/images/ecosystem/management.jpg', alt: 'Property management' },
    meta: {
      title: 'Property Management | Ecosystem Partners | MillionFlats',
      description:
        'Maximize rental income and minimize hassle—discover verified property managers, calculate net yield, and request proposals via MillionFlats.',
      ogImage: '/images/ecosystem/management.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Vetted & Experienced', description: 'Selected for local expertise and consistent tenant management.' },
      { title: 'Transparent Reporting', description: 'Clear fee structures with reporting and dashboards where available.' },
      { title: 'Owner Peace of Mind', description: 'Hands-off ownership with proactive maintenance coordination.' },
    ],
    faqs: [
      { question: 'Can NRIs use property management?', answer: 'Yes—share your location and ownership goals, we’ll match you with suitable partners.' },
    ],
    tool: 'property-management',
  },
  'vastu-feng-shui': {
    slug: 'vastu-feng-shui',
    title: 'Vastu / Feng Shui Consultants',
    subtitle:
      'Consult verified experts to enhance harmony and wellbeing—practical guidance, structured recommendations, and clarity you can trust.',
    heroImage: { src: '/images/ecosystem/vastu.jpg', alt: 'Vastu and Feng Shui consulting' },
    meta: {
      title: 'Vastu / Feng Shui Consultants | Ecosystem Partners | MillionFlats',
      description:
        'Consult authentic experts to evaluate and improve harmony, wellbeing, and energy flow for your space.',
      ogImage: '/images/ecosystem/vastu.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Verified Consultants', description: 'Curated experts focused on practical, explainable recommendations.' },
      { title: 'Clear Guidance', description: 'Understand what to change and why, with structured suggestions.' },
      { title: 'Respectful Approach', description: 'Partners adapt recommendations to your constraints and style.' },
    ],
    faqs: [
      { question: 'Is this only for new homes?', answer: 'No—consultations can help with existing homes, renovations, or layouts too.' },
    ],
    tool: null,
  },
  'tiles-surface-finishing': {
    slug: 'tiles-surface-finishing',
    title: 'Tiles & Surface Finishing',
    subtitle:
      'Find verified suppliers and installers for tiles, stone, and surface finishes—compare options and get matched with partners built for quality delivery.',
    heroImage: { src: '/images/ecosystem/tiles.jpg', alt: 'Tiles and surface finishing' },
    meta: {
      title: 'Tiles & Surface Finishing | Ecosystem Partners | MillionFlats',
      description:
        'Explore verified tile and surface finishing partners—compare materials, pricing bands, and installation support with clarity on MillionFlats.',
      ogImage: '/images/ecosystem/tiles.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Verified Partners', description: 'Suppliers and installers shortlisted for consistent quality, warranties and reliable fulfillment.' },
      { title: 'Material Clarity', description: 'Compare finishes, durability, use-cases and recommended grades before purchase.' },
      { title: 'Installation Support', description: 'Quantity takeoffs, wastage guidance and qualified installation teams for turnkey delivery.' },
      { title: 'Premium Brands', description: 'Access curated collections from leading tile and surface brands for luxury and commercial projects.' },
      { title: 'Bulk Procurement', description: 'Competitive pricing for large orders and coordinated logistics for site delivery.' },
      { title: 'Aftercare & Warranty', description: 'Partners provide maintenance guidance and warranty-backed installation services.' },
    ],
    overview: [
      'Navigate tile, stone and surface finishing decisions with confidence: choose partners who combine premium material quality with installation readiness.',
      'MillionFlats connects you to manufacturers, distributors and installers with clear pricing bands, lead-times and warranty commitments so projects stay on schedule.',
    ],
    highlights: [
      { title: 'Ceramic & Porcelain', description: 'Large-format, rectified and textured finishes for interiors and high-traffic areas.' },
      { title: 'Natural Stone & Marble', description: 'Sourced stone, honed and polished finishes, and recommendations for sealing and care.' },
      { title: 'Installation & Restoration', description: 'Qualified installers, restoration specialists and remedial services for existing floors.' },
      { title: 'Outdoor & Industrial Flooring', description: 'Slip-rated pavers, external porcelain and heavy-duty finishes for commercial use.' },
    ],
    workflow: [
      { title: 'Scope & Quantities', description: 'Define rooms, area, tile types and target finishes for an accurate takeoff.' },
      { title: 'Sample & Selection', description: 'Order samples, review finishes on-site and finalize colour, size and grout choices.' },
      { title: 'Logistics & Delivery', description: 'Agree lead times, staging and site delivery windows to match construction milestones.' },
      { title: 'Installation & Handover', description: 'Coordinate installers, inspect works, and confirm finish quality with warranty documentation.' },
    ],
    resources: [
      { title: 'Tile selection checklist', description: 'Evaluate finish, size, grout, and performance before you confirm a supplier.', href: '/resources/tile-selection-checklist' },
      { title: 'Installation planning guide', description: 'Align quantity estimates, wastage and on-site coordination to reduce rework.', href: '/resources/installation-planning' },
      { title: 'How to calculate tile quantity', description: 'Step-by-step quantity estimation for rooms and layouts.', href: '/resources/calculate-tile-quantity' },
      { title: 'Luxury flooring maintenance', description: 'Care guides for marble, granite and natural stone to preserve finish.', href: '/resources/flooring-maintenance' },
    ],
    featuredSection: {
      title: 'Featured finish & tile partners',
      badge: 'Top-rated sourcing',
      exploreHref: '/ecosystem-partners/tiles-surface-finishing',
    },
    faqs: [
      { question: 'Do partners help with installation?', answer: 'Many partners offer installation or recommend verified installers depending on your city.' },
      { question: 'How do I estimate tile quantity for a room?', answer: 'Use our tile quantity calculator and include 5–10% wastage depending on layout and cuts.' },
      { question: 'What is the difference between ceramic and porcelain?', answer: 'Porcelain is denser and more water resistant—ideal for outdoors and heavy traffic; ceramic suits interiors and lighter use.' },
      { question: 'How are anti‑skid ratings defined?', answer: 'R and P ratings indicate slip resistance — partners will recommend appropriate ratings for wet or external areas.' },
      { question: 'Can I order large-format tiles for my project?', answer: 'Yes—partners can advise on substrate preparation, expansion joints and handling requirements.' },
      { question: 'Do tiles come with a warranty?', answer: 'Manufacturers often provide material warranties; installers may provide work warranties—these are listed in partner profiles.' },
      { question: 'How long does delivery typically take?', answer: 'Lead times vary by product and order size—expect 1–6 weeks depending on stock and custom orders.' },
      { question: 'Can partners provide samples?', answer: 'Yes—many suppliers offer sample kits so you can verify colour and finish on-site.' },
      { question: 'What grout should I use for marble?', answer: 'Use non‑staining, flexible grout recommended by the stone supplier; consult your installer for best results.' },
      { question: 'Are there maintenance services available?', answer: 'Yes—partners offer sealing, polishing and remedial services for natural stone and damaged tiles.' },
      { question: 'Can I get bulk pricing for large orders?', answer: 'Share your BOQ and delivery locations — partners will provide project quotes and logistics options.' },
      { question: 'Do you support international brands?', answer: 'We partner with domestic and international distributors — import timelines and duties are shown where applicable.' },
      { question: 'What if the delivered tiles are damaged?', answer: 'Follow the partner’s inspection and claims process; many partners include damage insurance during transport.' },
      { question: 'Can partners match existing tiles for repairs?', answer: 'Some suppliers provide matching services; send a sample or photo for matching recommendations.' },
      { question: 'How to choose between matte and polished finish?', answer: 'Consider slip resistance, glare, and maintenance — polished suits interior luxury, matte for subtle texture and grip.' },
    ],
    tool: null,
  },
  'hardware-architectural-fittings': {
    slug: 'hardware-architectural-fittings',
    title: 'Hardware & Architectural Fittings',
    subtitle:
      'Source quality fittings with confidence—verified partners, clear specs, dependable delivery, and guidance for the right selection.',
    heroImage: { src: '/images/ecosystem/hardware.jpg', alt: 'Hardware and architectural fittings' },
    meta: {
      title: 'Hardware & Architectural Fittings | Ecosystem Partners | MillionFlats',
      description:
        'Find verified partners for hardware and architectural fittings—clear specifications, pricing bands, and dependable sourcing on MillionFlats.',
      ogImage: '/images/ecosystem/hardware.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Verified Suppliers', description: 'Shortlisted partners focused on authentic products, certifications and consistent fulfillment.' },
      { title: 'Spec-first Selection', description: 'Filter by finish, size and function to match design intent and substrate types.' },
      { title: 'Project Procurement', description: 'BOQ management, bulk pricing and coordinated delivery for multi-site projects.' },
      { title: 'Installation Compatibility', description: 'Products matched to door/window systems and architectural specifications to reduce rework.' },
      { title: 'Safety & Compliance', description: 'Access partners who meet commercial standards and test certificates when required.' },
      { title: 'After-sales Support', description: 'Warranty, spare parts and maintenance services for long-term reliability.' },
    ],
    overview: [
      'Find door hardware, locks, sliding systems, kitchen fittings and commercial-grade architectural hardware from verified suppliers.',
      'MillionFlats helps you select compatible hardware that respects finish continuity, performance and accessibility requirements.',
    ],
    highlights: [
      { title: 'Door & Lock Systems', description: 'Mechanical and digital locks, multipoint systems and access control integration.' },
      { title: 'Kitchen & Bathroom Hardware', description: 'Handles, hinges, soft‑close systems and durable fixtures for heavy-use areas.' },
      { title: 'Glass & Sliding Systems', description: 'Structural glass hardware, patch fittings and slim-profile sliding systems for modern interiors.' },
      { title: 'Commercial-grade Solutions', description: 'Hardware rated for commercial use with fire-rating and high-frequency operation.' },
    ],
    workflow: [
      { title: 'Define functional requirements', description: 'Specify door types, loads, desired security and finish palette.' },
      { title: 'Shortlist compatible products', description: 'Compare by specs, certifications and lead times to avoid retrofits.' },
      { title: 'Procure and schedule delivery', description: 'Coordinate factory deliveries with site readiness and glazing or door installation.' },
      { title: 'Install & validate', description: 'Work with certified installers and validate operation during handover.' },
    ],
    resources: [
      { title: 'Door hardware guide', description: 'Choose locks, hinges and handles for residential and commercial doors.', href: '/resources/door-hardware-guide' },
      { title: 'Digital locks comparison', description: 'Understand battery, connectivity and backup options for smart locks.', href: '/resources/digital-locks' },
      { title: 'Procurement planning kit', description: 'Match BOQs with supplier capacity and lead times.', href: '/resources/procurement-planning' },
    ],
    featuredSection: {
      title: 'Featured hardware partners',
      badge: 'Premium fittings',
      exploreHref: '/ecosystem-partners/hardware-architectural-fittings',
    },
    faqs: [
      { question: 'Do partners support bulk orders?', answer: 'Yes—share your BOQ and delivery locations; partners will provide project pricing and logistics plans.' },
      { question: 'Can I get hardware samples before ordering?', answer: 'Many suppliers provide sample packs for finish and tactile verification.' },
      { question: 'Are digital locks compatible with existing doors?', answer: 'Compatibility depends on door thickness and frame—partners provide retrofit assessment services.' },
      { question: 'What certifications should I look for in commercial hardware?', answer: 'Look for fire-rating, cycle tests and relevant local compliance certificates where applicable.' },
      { question: 'Do suppliers provide spare parts?', answer: 'Yes—ask about spares and long-term availability when procuring commercial-grade hardware.' },
      { question: 'Can hardware be matched across finishes?', answer: 'Suppliers can match finishes and custom colour plating for consistent aesthetics.' },
      { question: 'What lead times should I expect?', answer: 'Lead times vary by manufacturer and finish; plan for 2–8 weeks for customised orders.' },
      { question: 'Do you offer installation services?', answer: 'Some partners offer installation or can recommend certified installers.' },
      { question: 'Are soft‑close systems warranty-backed?', answer: 'Many manufacturers provide warranty on soft‑close mechanisms—details are listed in partner profiles.' },
      { question: 'Can hardware be ordered for multi-site projects?', answer: 'Yes—partners support phased deliveries and consolidated logistics for larger projects.' },
      { question: 'How do I ensure compatibility with glass fittings?', answer: 'Share glass thickness and frame details—partners will recommend compatible patch fittings and hardware.' },
      { question: 'Do partners support commercial projects?', answer: 'Yes—commercial-grade hardware with documented cycle ratings is available for heavy-use applications.' },
      { question: 'What about maintenance?', answer: 'Partners offer maintenance contracts and spare part supply for long-term support.' },
      { question: 'Can I request on-site measurements?', answer: 'Measurement and templating services are available with many suppliers for accurate fabrication.' },
      { question: 'Is CE or BIS certification required?', answer: 'Certification requirements depend on project type and local regulations; partners will advise accordingly.' },
    ],
    tool: null,
  },
  'cement-structural': {
    slug: 'cement-structural',
    title: 'Cement & Structural',
    subtitle:
      'Build on strong fundamentals—verified suppliers for cement and structural materials with transparent pricing and reliable delivery.',
    heroImage: { src: '/images/ecosystem/cement.jpg', alt: 'Cement and structural materials' },
    meta: {
      title: 'Cement & Structural | Ecosystem Partners | MillionFlats',
      description:
        'Connect with verified cement and structural material partners—transparent pricing, reliable delivery, and project-ready support on MillionFlats.',
      ogImage: '/images/ecosystem/cement.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Reliable Supply', description: 'Partners focused on consistent grades, scheduled deliveries and bulk fulfilment.' },
      { title: 'Transparent Pricing', description: 'Project-level quotes with clear terms and freight-inclusive options where possible.' },
      { title: 'Technical Support', description: 'Advice on concrete grades, admixtures and on-site testing for quality assurance.' },
      { title: 'Logistics Coordination', description: 'Site staging, storage guidance and last-mile delivery for heavy materials.' },
      { title: 'Bulk Procurement', description: 'Volume discounts and consolidated invoicing for developer and contractor projects.' },
      { title: 'Testing & Compliance', description: 'Access certified testing labs and material verification services through partners.' },
    ],
    overview: [
      'Connect with suppliers of cement, steel, ready-mix and construction chemicals that support large-scale construction schedules.',
      'MillionFlats partners help contractors and developers source reliable grades, coordinate deliveries and minimise downtime on site.',
    ],
    highlights: [
      { title: 'Cement & Binders', description: 'OPC, PPC and specialty cements with grade certificates and bulk delivery options.' },
      { title: 'Reinforcement & Steel', description: 'Sourced steel and prefabricated reinforcement where available for faster installation.' },
      { title: 'Concrete & Admixtures', description: 'Ready-mix providers and chemical additives for workability, set time and durability.' },
      { title: 'Waterproofing & Chemicals', description: 'Industry-grade membranes, coatings and construction chemicals for durable structures.' },
    ],
    workflow: [
      { title: 'Define material schedule', description: 'Share pour dates, volumes and access constraints for accurate planning.' },
      { title: 'Request project quotes', description: 'Receive supplier proposals with grade, delivery windows and testing plans.' },
      { title: 'Confirm supplier & logistics', description: 'Lock delivery dates, storage instructions and inspection checkpoints.' },
      { title: 'Quality checks & handover', description: 'Coordinate sampling, testing and certificate submission during delivery.' },
    ],
    resources: [
      { title: 'Which cement should you buy?', description: 'Understand OPC, PPC and specialty binders for different structural needs.', href: '/resources/which-cement' },
      { title: 'Concrete grade selector', description: 'Match structural requirements to the correct concrete grade and admixture strategy.', href: '/resources/concrete-grades' },
      { title: 'Bulk procurement guide', description: 'Tips for negotiating bulk rates, deliveries and storage on large projects.', href: '/resources/bulk-procurement' },
    ],
    featuredSection: {
      title: 'Featured cement & structural suppliers',
      badge: 'Trusted delivery',
      exploreHref: '/ecosystem-partners/cement-structural',
    },
    faqs: [
      { question: 'Can partners deliver heavy materials to site?', answer: 'Yes—site delivery and offloading options are offered depending on access and order size.' },
      { question: 'How are concrete grades specified?', answer: 'Grades are specified by structural engineers; partners will confirm mix design and compliance.' },
      { question: 'Do suppliers offer testing services?', answer: 'Many partners coordinate with certified labs for sampling and compressive strength testing.' },
      { question: 'What are common lead times for cement and steel?', answer: 'Lead times depend on availability—plan for 1–4 weeks for most bulk orders, longer for specialty items.' },
      { question: 'Can I schedule phased deliveries?', answer: 'Yes—phased and just-in-time deliveries can be arranged to match pours and site capacity.' },
      { question: 'Are there minimum order quantities?', answer: 'MOQ varies by supplier and product—partners will surface MOQs in proposals.' },
      { question: 'Do partners support international-grade products?', answer: 'Some suppliers import specialty products; import timelines and duties will be included in quotes.' },
      { question: 'Is insurance available during transit?', answer: 'Insurance options are available for high-value or large-volume shipments—confirm with the partner.' },
      { question: 'How do I handle material storage on site?', answer: 'Follow the provided site delivery checklist to ensure proper stacking, coverage and access.' },
      { question: 'What about seasonal considerations?', answer: 'Hot or wet seasons affect concrete curing and delivery windows—partners advise on mitigation strategies.' },
      { question: 'Can I request certified steel mill test reports?', answer: 'Yes—partners can provide MTRs for reinforcement and structural steel products.' },
      { question: 'Are supply contracts supported?', answer: 'Partners can provide framework agreements for repeat orders and long projects.' },
      { question: 'How is freight calculated?', answer: 'Freight depends on weight, distance and handling—partners include transport options in proposals.' },
      { question: 'Do you offer vendor-managed inventory?', answer: 'Some suppliers provide VMI or staged delivery models for large projects—discuss during procurement.' },
      { question: 'What safety documentation is provided?', answer: 'Delivery notes, certificates and compliance documentation are provided as part of the project handover.' },
    ],
    tool: null,
  },
  'smart-home-automation': {
    slug: 'smart-home-automation',
    title: 'Smart Home & Automation',
    subtitle:
      'Upgrade your home with verified automation partners—supported brands, clean installation, and optional AMC for peace of mind.',
    heroImage: { src: '/images/ecosystem/smart-home.jpg', alt: 'Smart home automation' },
    meta: {
      title: 'Smart Home & Automation | Ecosystem Partners | MillionFlats',
      description:
        'Explore verified smart home and automation partners—supported brands, installation, and AMC options with clear proposals on MillionFlats.',
      ogImage: '/images/ecosystem/smart-home.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Brand Compatibility', description: 'Partners help you choose interoperable devices and platform strategies.' },
      { title: 'Clean Installation', description: 'Structured wiring, concealment and commissioning to keep interiors pristine.' },
      { title: 'Ongoing Support', description: 'AMC options, remote support and managed services for reliable operation.' },
      { title: 'Scalable Architecture', description: 'Designs that grow from single-room pilot to whole-home automation and multi-site deployments.' },
      { title: 'Security & Privacy', description: 'Partners follow secure onboarding, encryption and access control best practices.' },
      { title: 'Energy Optimisation', description: 'Solutions that reduce consumption with intelligent scheduling and monitoring.' },
    ],
    overview: [
      'Create a smart home that is reliable, maintainable and future-ready—select certified partners for device compatibility, neat installation and service continuity.',
      'MillionFlats matches you with automation integrators who handle planning, installation, testing and handover with documented warranties.',
    ],
    highlights: [
      { title: 'Security & Surveillance', description: 'CCTV, NVR systems, access control and remote monitoring solutions.' },
      { title: 'Lighting & Scenes', description: 'Dimmable, programmable and human‑centric lighting systems for comfort and efficiency.' },
      { title: 'Climate & Energy', description: 'Smart thermostats, HVAC integration and energy monitoring for savings and comfort.' },
      { title: 'Entertainment & AV', description: 'Home theatre, multi-room audio and integrated control systems.' },
    ],
    workflow: [
      { title: 'Discovery & Goals', description: 'Define use cases, rooms and priority systems for the automation rollout.' },
      { title: 'System Design', description: 'Wiring, hub selection and interoperability planning to avoid future lock‑in.' },
      { title: 'Installation & Commissioning', description: 'Device installation, network hardening and scene programming with user training.' },
      { title: 'Support & AMC', description: 'Define SLAs, support access and periodic health checks for long-term reliability.' },
    ],
    resources: [
      { title: 'Planning Smart Homes', description: 'Map rooms, use cases and network requirements before you buy.', href: '/resources/planning-smart-homes' },
      { title: 'Voice assistant comparison', description: 'Google Home vs Alexa — integration and privacy considerations.', href: '/resources/voice-assistant-compare' },
      { title: 'Energy saving guide', description: 'Smart strategies for reducing consumption with automation.', href: '/resources/energy-saving' },
    ],
    featuredSection: {
      title: 'Featured automation partners',
      badge: 'Connected living',
      exploreHref: '/ecosystem-partners/smart-home-automation',
    },
    faqs: [
      { question: 'Can I automate an existing home?', answer: 'Yes—partners provide retrofit options that minimise surface runs and use wireless or concealed wiring where possible.' },
      { question: 'Which brands are commonly supported?', answer: 'Leading brands such as Lutron, Philips Hue, Schneider and Hikvision are commonly supported; partners will advise compatibility.' },
      { question: 'Do smart systems require internet?', answer: 'Many functions work locally but cloud connectivity enables remote access, updates and voice assistants.' },
      { question: 'What are AMC plans?', answer: 'Annual maintenance contracts cover firmware updates, remote diagnostics and periodic on-site checks.' },
      { question: 'Can systems be expanded later?', answer: 'Good architecture allows future expansion—choose partners who design for scalability.' },
      { question: 'How do you secure smart devices?', answer: 'Use strong network segmentation, device hardening and partner-recommended encryption practices.' },
      { question: 'Who provides user training?', answer: 'Integrators include commissioning and user training during handover to ensure correct usage.' },
      { question: 'What about battery-backed devices?', answer: 'Critical devices can include UPS or battery backups—partners advise based on system needs.' },
      { question: 'Can I integrate voice assistants?', answer: 'Yes—partners can integrate scenes and controls with voice platforms while managing privacy settings.' },
      { question: 'Is data collected by devices stored securely?', answer: 'Partners follow data minimisation and secure storage practices; review partner privacy policies for details.' },
      { question: 'How long does installation take?', answer: 'Small systems take a few days; whole‑home integrations can take several weeks depending on scope.' },
      { question: 'Do partners provide warranties?', answer: 'Yes—device and installation warranties are documented in the partner profile and proposal.' },
      { question: 'What network requirements exist?', answer: 'Robust Wi‑Fi or wired backhaul is recommended for reliable device communication.' },
      { question: 'Can I monitor energy usage?', answer: 'Energy monitoring is available via compatible meters and dashboards provided by partners.' },
      { question: 'Are there retrofit-friendly options?', answer: 'Yes—wireless and low-voltage solutions are commonly used to avoid major rewiring.' },
    ],
    tool: null,
  },
  'technology-partners': {
    slug: 'technology-partners',
    title: 'Technology Partners',
    subtitle:
      'Collaborate with innovators building the next generation of property discovery, CRM, automation, and intelligence experiences.',
    heroImage: { src: '/images/ecosystem/technology.jpg', alt: 'Technology partners' },
    meta: {
      title: 'Technology Partners | Ecosystem Partners | MillionFlats',
      description:
        'Connect with technology innovators building CRM, automation, analytics, and digital property experiences with MillionFlats.',
      ogImage: '/images/ecosystem/technology.jpg',
    },
    primaryCta: { label: 'Request Consultation' },
    secondaryCta: { label: 'Explore Partners' },
    benefits: [
      { title: 'Built for Scale', description: 'Partners help power discovery, workflow, automation and analytics across millions of property journeys.' },
      { title: 'Enterprise Integrations', description: 'Standardised APIs, webhooks and developer tooling for reliable product integrations.' },
      { title: 'Marketplace Distribution', description: 'Showcase solutions to a marketplace of developers, agents and enterprise customers.' },
      { title: 'Co-marketing & GTM', description: 'Joint campaigns, case studies and partner success programs to accelerate adoption.' },
      { title: 'Developer Support', description: 'Sandbox environments, documentation and technical onboarding for rapid integrations.' },
      { title: 'Security & Compliance', description: 'Guidance and requirements for secure integrations and data handling.' },
    ],
    overview: [
      'Technology partners integrate deeply with MillionFlats to enable CRM workflows, analytics, payments, mapping and automation that power modern real estate experiences.',
      'This category is designed for SaaS companies, enterprise systems and platform vendors seeking distribution, co‑innovation and product integrations.',
    ],
    highlights: [
      { title: 'AI & Data', description: 'Models for pricing, image analytics, recommendation and property intelligence.' },
      { title: 'Cloud & Infra', description: 'Scalable hosting, storage and resilient APIs for real-time services.' },
      { title: 'Payments & Identity', description: 'Secure payment rails, KYC and identity verification integrations.' },
      { title: 'GIS & Mapping', description: 'Mapping, geocoding and spatial analytics for discovery and insights.' },
    ],
    workflow: [
      { title: 'Apply & Certify', description: 'Register your integration, share technical docs and complete security checks.' },
      { title: 'Pilot & Integrate', description: 'Work with engineers to build, test and run pilots with real flows.' },
      { title: 'Go Live & Scale', description: 'Publish integrations, onboard customers and measure adoption.' },
      { title: 'Grow & Co-innovate', description: 'Joint product work, revenue-sharing and reference engagements.' },
    ],
    resources: [
      { title: 'Integration guide', description: 'API conventions, auth, webhooks and data models for partner integrations.', href: '/resources/tech-integration-guide' },
      { title: 'Security standards', description: 'Expectations for encryption, access control and secure data handling.', href: '/resources/security-standards' },
      { title: 'Developer portal', description: 'Docs, sandboxes and onboarding steps for engineering teams.', href: '/resources/developer-portal' },
    ],
    featuredSection: {
      title: 'Featured technology partners',
      badge: 'Platform innovation',
      exploreHref: '/ecosystem-partners/technology-partners',
    },
    faqs: [
      { question: 'Who should apply?', answer: 'Technology companies building property platforms, CRM tools, analytics, payments, mapping or automation integrations should apply.' },
      { question: 'What is the technical onboarding process?', answer: 'Complete registration, review API docs, run a sandbox integration and submit security information for a certification review.' },
      { question: 'Do you offer sandbox access?', answer: 'Yes—partners receive sandbox credentials and sample datasets for testing.' },
      { question: 'What commercial motions are available?', answer: 'Marketplace listing, revenue share, referral programs and joint GTM are available depending on the partnership tier.' },
      { question: 'How do you handle data privacy?', answer: 'We expect partners to meet our security and privacy standards; specific data sharing is governed by agreements.' },
      { question: 'Is there a developer support SLA?', answer: 'Partner tiers include documented support windows and escalation paths for technical issues.' },
      { question: 'Can startups join?', answer: 'Yes—we offer programs to accelerate early-stage partners through pilot support and product matchmaking.' },
      { question: 'What integrations are prioritised?', answer: 'Integrations that improve buyer journeys, enable automation, or reduce friction in core flows are prioritised.' },
      { question: 'Do you require penetration testing?', answer: 'Critical integrations may require third-party security assessments depending on data scope.' },
      { question: 'What commercial metrics are tracked?', answer: 'Adoptions, activation, conversion and partnership ROI metrics are used to measure success.' },
      { question: 'How long does certification take?', answer: 'Typical certification time ranges from 2–8 weeks depending on complexity and compliance needs.' },
      { question: 'Can partners co-sell with MillionFlats?', answer: 'Yes—co-selling and joint marketing programs are available for qualified partners.' },
      { question: 'Are there sandbox integration examples?', answer: 'Developer docs include sample code, Postman collections and reference apps.' },
      { question: 'How do I get product feedback?', answer: 'Partners get access to product managers and roadmap discussions as part of collaboration.' },
      { question: 'Is revenue sharing available?', answer: 'Revenue models vary—discuss options during commercial negotiations.' },
    ],
    tool: null,
  },
}

export function getEcosystemCategoryConfig(slug: string) {
  const key = slug as EcosystemCategorySlug
  return (ECOSYSTEM_CATEGORY_CONFIG as any)[key] as EcosystemCategoryConfig | undefined
}
