export const PASSPORT_PRICE_INR = 4999
export const PASSPORT_PRICE_PAISE = PASSPORT_PRICE_INR * 100
export const PASSPORT_CURRENCY = 'INR' as const
export const PASSPORT_PRICE_LABEL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: PASSPORT_CURRENCY,
  maximumFractionDigits: 0,
}).format(PASSPORT_PRICE_INR)

export const PASSPORT_CATEGORY_META = {
  PROPERTY_BUYERS: {
    label: 'Property Buyers',
    description: 'For people buying or exploring a property purchase.',
  },
  TENANTS_AND_RENTAL_OWNERS: {
    label: 'Tenants & Rental Owners',
    description: 'For tenants and owners involved in residential rentals.',
  },
  REAL_ESTATE_AGENTS: {
    label: 'Real Estate Agents',
    description: 'For independent real estate professionals.',
  },
  REAL_ESTATE_AGENCIES: {
    label: 'Real Estate Agencies',
    description: 'For registered real estate businesses and teams.',
  },
  REAL_ESTATE_DEVELOPERS: {
    label: 'Real Estate Developers',
    description: 'For businesses developing property projects.',
  },
  ECOSYSTEM_PARTNERS: {
    label: 'Ecosystem Partners',
    description: 'For businesses providing services across the property ecosystem.',
  },
} as const

export type PassportCategoryKey = keyof typeof PASSPORT_CATEGORY_META

export function isPassportCategoryKey(category: unknown): category is PassportCategoryKey {
  return typeof category === 'string'
    && Object.prototype.hasOwnProperty.call(PASSPORT_CATEGORY_META, category)
}

export const PASSPORT_CATEGORY_BENEFITS: Record<
  PassportCategoryKey,
  readonly { title: string; description: string }[]
> = {
  PROPERTY_BUYERS: [
    { title: 'Exclusive Property Access', description: 'See private pre-launch and off-market luxury homes before the general public.' },
    { title: 'One-Tap 3D Tours & Market Data', description: 'Tap your card to instantly view 3D virtual home tours, fair price checks, and market comparisons.' },
    { title: 'VIP Visits & Personal Concierge', description: 'Get priority site visits and a dedicated manager to help you buy across India and the UAE.' },
    { title: 'Home Loan, Legal & Insurance Deals', description: 'Save money on bank loan processing fees, legal property checks, and home insurance.' },
    { title: 'Home Setup Discounts', description: 'Get member discounts on interior design, tiles, marble, hardware, smart home systems, and movers.' },
    { title: 'Lifestyle Perks & Referral Rewards', description: 'Enjoy special offers at partner hotels and restaurants, VIP event invites, and rewards for referring friends.' },
  ],
  TENANTS_AND_RENTAL_OWNERS: [
    { title: 'Packers & Movers Discounts', description: 'Save instantly on trusted local and international moving companies.' },
    { title: 'Legal & Lease Support', description: 'Get discounted legal help for drafting and reviewing rental agreements.' },
    { title: 'Property Management Perks', description: 'Enjoy lower rates on tenant coordination, regular home inspections, and full rental management.' },
    { title: 'Furnishing & Smart Security Deals', description: 'Get special member pricing on modular furniture, smart locks, CCTV cameras, and rental insurance.' },
    { title: 'Priority Rental Concierge', description: 'Let a dedicated team schedule your rental viewings and connect you with home service providers.' },
    { title: 'Hotel, Dining & Referral Perks', description: 'Unlock year-round discounts at partner hotels, restaurants, and wellness centers, plus referral rewards.' },
  ],
  REAL_ESTATE_AGENTS: [
    { title: '180-Day Client Lead Lock', description: 'Tap your metal card at builder sites to lock your client in your name for 180 days so no one can poach your deal.' },
    { title: 'Instant One-Tap 3D Sharing', description: "Tap your card on any buyer's phone to instantly open 3D property tours, videos, and brochures." },
    { title: 'Priority Leads & India–UAE Support', description: 'Receive priority buyer enquiries and full support to close cross-border India–UAE deals.' },
    { title: 'Extra Income From 12 Services', description: 'Earn bonus commissions whenever your client uses our home loans, interior designers, legal services, or insurance.' },
    { title: 'VIP Metal Card Status', description: 'Stand out at elite networking events with a custom-engraved metal card and track all your deals in one dashboard.' },
  ],
  REAL_ESTATE_AGENCIES: [
    { title: 'Team-Wide Lead Protection', description: 'Give custom metal cards to your directors to lock and protect all team site visits for 180 days.' },
    { title: 'All-in-One Agency Dashboard', description: "Track all your team's enquiries, site visits, deal stages, and commissions in one central place." },
    { title: 'Ready India–UAE Sales Desk', description: 'Easily sell Dubai/UAE and pan-India luxury projects with ready documentation and closing support.' },
    { title: 'Smart Market Data for Pitching', description: 'Close wealthy investors faster using ready price benchmarks and property comparison tools.' },
    { title: 'VIP Builder & Investor Events', description: 'Get priority invites for agency leaders to attend private project launches and investor meetups.' },
    { title: 'Extra Commissions Across 12 Services', description: 'Earn additional agency revenue when clients book home loans, interiors, legal help, or insurance.' },
  ],
  REAL_ESTATE_DEVELOPERS: [
    { title: 'Direct Access to VIP & NRI Buyers', description: 'Showcase your projects directly to verified MillionFlats cardholders and NRI investors.' },
    { title: 'One-Tap 3D Project Sharing', description: "Give your sales team metal cards that open your project's 3D tour and brochure on a buyer's phone in one tap." },
    { title: 'Smart Sales-Gallery Check-In', description: 'Automate buyer check-ins at your site office with one tap and track every visit live in the CRM.' },
    { title: 'VIP Launch Events', description: 'Co-host private property previews and launch events for high-net-worth investors.' },
    { title: 'Marketing Package Discounts', description: 'Get special member discounts on MillionFlats promotional and marketing packages.' },
  ],
  ECOSYSTEM_PARTNERS: [
    { title: 'Dedicated Partner Storefront', description: 'Get your own profile and offer page inside the Member Portal where buyers tap to claim your services.' },
    { title: 'Warm Buyer Introductions', description: 'Our concierge team directly connects you with luxury home buyers right when they buy or move into a home.' },
    { title: 'High-Trust Sales (No Cold Calling)', description: 'Convert clients much faster because buyers trust you as an official MillionFlats partner.' },
    { title: 'Direct Builder & Agent Networking', description: 'Meet developers and top brokers at private MillionFlats events to win bulk business contracts.' },
    { title: '180-Day Referral Lock', description: 'Use your metal card to lock your client referrals for 180 days with full tracking in the portal.' },
  ],
}

export const PASSPORT_CATEGORIES = Object.entries(PASSPORT_CATEGORY_META).map(([value, config]) => ({
  value: value as PassportCategoryKey,
  label: config.label,
  description: config.description,
}))

export function getPassportCategoryMeta(category: string) {
  if (!isPassportCategoryKey(category)) return null
  return PASSPORT_CATEGORY_META[category as PassportCategoryKey]
}
