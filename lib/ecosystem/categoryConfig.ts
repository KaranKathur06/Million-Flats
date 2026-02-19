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

export type EcosystemCategoryConfig = {
  slug: EcosystemCategorySlug
  title: string
  subtitle: string
  heroImage: { src: string; alt: string }
  meta: { title: string; description: string; ogImage?: string }
  primaryCta: { label: string }
  secondaryCta: { label: string }
  benefits: EcosystemBenefit[]
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
}

export function getEcosystemCategoryConfig(slug: string) {
  const key = slug as EcosystemCategorySlug
  return (ECOSYSTEM_CATEGORY_CONFIG as any)[key] as EcosystemCategoryConfig | undefined
}
