export type ServiceFeature = {
  title: string
  description: string
}

export type ServicePackage = {
  name: string
  subtitle: string
  price: string
  taxNote: string
  featured?: boolean
  features: ServiceFeature[]
}

export type ServiceSegment = {
  key: 'developers' | 'agencies' | 'agents'
  title: string
  description: string
  headline: string
  highlightedHeadline: string
  eyebrow: string
  registrationHref: string
  registrationLabel: string
  relatedLinks: { label: string; href: string }[]
  packages: ServicePackage[]
}

export const SERVICE_SEGMENTS: Record<ServiceSegment['key'], ServiceSegment> = {
  developers: {
    key: 'developers',
    title: 'Real Estate Developer Plans',
    description: 'Developer growth packages for verified listings, AI qualification, property media, and investor outreach on MillionFlats.',
    eyebrow: 'Developer Growth Infrastructure',
    headline: 'MAXIMIZE YOUR DEVELOPER OUTREACH.',
    highlightedHeadline: 'POWER YOUR PROJECTS WITH AI.',
    registrationHref: '/developer/auth?tab=register',
    registrationLabel: 'Register as a Developer',
    relatedLinks: [
      { label: 'Explore Projects', href: '/projects' },
      { label: 'Browse Properties', href: '/buy' },
      { label: 'AI System™', href: '/ai-system' },
      { label: '3D Tours', href: '/services/3d-tours' },
      { label: 'Contact MillionFlats', href: '/contact' },
    ],
    packages: [
      {
        name: 'Annual Essential',
        subtitle: 'Small / Single Projects',
        price: '₹99,000',
        taxNote: '+ GST Applicable',
        features: [
          { title: '1 Year Verified Project Listing', description: 'Official verified listing badge and dedicated project profile on MillionFlats.' },
          { title: 'Top Category Banner', description: '3 Months prime category visibility to capture active home-seekers.' },
          { title: 'AI Calling Agent Setup + 1,000 Mins', description: 'Conversational AI agent setup with 1,000 minutes of automated lead qualification.' },
          { title: '2 AI Property Videos', description: '1–2 min high-converting AI walkthrough reels highlighting amenities and floor plans.' },
          { title: '1 Mega Email Blast', description: 'Targeted dispatch to 10 Lakh verified HNI and NRI real estate investors.' },
        ],
      },
      {
        name: '360° AI Growth Suite',
        subtitle: 'Full-Scale Sales & Outreach Engine',
        price: '₹1,75,000',
        taxNote: '+ GST Applicable',
        featured: true,
        features: [
          { title: '1 Year Verified Priority Listing', description: 'Premium placement featuring the prestigious AIShield™ trust badge.' },
          { title: '12 Months Prime City / Homepage Banner', description: 'Year-round top-tier prominence on city portals and the MillionFlats homepage.' },
          { title: 'AI Calling Agent + 2,500 Mins', description: 'Enterprise AI calling workflow with 2,500 minutes of automated calls and live transfers.' },
          { title: '4 AI Property Videos', description: '1 video per quarter (1–2 min each) aligned with new phase launches and festive offers.' },
          { title: '2 Mega Email Blasts', description: 'Dispatched to 10 Lakh database timed for pre-launch momentum and festive peaks.' },
          { title: 'Direct WhatsApp Lead CRM Integration', description: 'Real-time instant lead routing into your sales team’s WhatsApp and CRM dashboards.' },
        ],
      },
    ],
  },
  agencies: {
    key: 'agencies',
    title: 'Real Estate Agency Solutions',
    description: 'AI-powered growth infrastructure for real estate agencies, from centralized roster management to verified inventory and investor outreach.',
    eyebrow: 'Agency Growth Infrastructure',
    headline: 'EMPOWER YOUR REAL ESTATE BUSINESS.',
    highlightedHeadline: 'SCALE WITH THE MILLIONFLATS ECOSYSTEM.',
    registrationHref: '/agency/auth?tab=register',
    registrationLabel: 'Register as an Agency',
    relatedLinks: [
      { label: 'Browse Agent Profiles', href: '/agents' },
      { label: 'Browse Properties', href: '/buy' },
      { label: '3D Tours', href: '/services/3d-tours' },
      { label: 'Agent registration', href: '/agent/auth?tab=register' },
      { label: 'Contact MillionFlats', href: '/contact' },
    ],
    packages: [
      {
        name: 'Boutique Agency Suite',
        subtitle: 'Growing Firms (Up to 10 Agents)',
        price: '₹89,000',
        taxNote: '+ GST Applicable',
        features: [
          { title: 'Agency Hub + 10 Agent Accounts', description: 'Centralized firm profile with individual AIPro™ verified agent roster sub-accounts.' },
          { title: '75 Active Verified Listings', description: 'Pooled firm listing quota with shared branding and consolidated analytics.' },
          { title: 'Agency AI Calling Agent + 2,000 Mins', description: 'Central lead screening with automated routing based on property budget and locality.' },
          { title: '24 AI Property Videos Annually', description: '6 videos per quarter branded with your agency watermark, phone, and website.' },
          { title: '1 City-Wide HNI Email Blast', description: 'Dispatched to 5 Lakh verified investors spotlighting your agency’s prime portfolio.' },
        ],
      },
      {
        name: 'Enterprise AI Powerhouse',
        subtitle: 'Full-Scale Growth Engine for Premier Brokerages',
        price: '₹1,49,000',
        taxNote: '+ GST Applicable',
        featured: true,
        features: [
          { title: 'Unlimited Agent Roster + AIShield™ Corporate', description: 'Enterprise agency portal with unlimited agent logins and company trust badge.' },
          { title: 'Unlimited Inventory & Priority Search Feed', description: 'All active listings receive top algorithmic indexing and international buyer exposure.' },
          { title: 'Custom AI Voice Agent + 5,000 Mins', description: 'Custom trained multilingual English/Hindi AI agent with round-robin routing.' },
          { title: '64 AI Property Walkthrough Videos', description: '16 cinematic reels per quarter covering major launches, resale exclusives, and penthouses.' },
          { title: '2 Mega Email Blasts to 10 Lakh Database', description: 'Investor dispatches timed for pre-launch momentum and festival season.' },
          { title: '12 Months Prime City Homepage Banner', description: 'Continuous year-round exposure on MillionFlats city portal and Agency Directory.' },
          { title: 'Full WhatsApp API & Webhook Integration', description: 'Syncs with Salesforce, LeadSquared, HubSpot, Zoho, or your existing CRM.' },
        ],
      },
    ],
  },
  agents: {
    key: 'agents',
    title: 'Real Estate Agent Plans',
    description: 'Accelerate inventory absorption and connect directly with high-intent buyers through verified credentials, AI qualification, and lead tools built around your public agent profile.',
    eyebrow: 'Agent Growth Infrastructure',
    headline: 'GROW YOUR REAL ESTATE BUSINESS.',
    highlightedHeadline: 'BUILD TRUST. WIN MORE CLIENTS.',
    registrationHref: '/agent/auth?tab=register',
    registrationLabel: 'Register as an Agent',
    relatedLinks: [
      { label: 'Agent Dashboard', href: '/agent/dashboard' },
      { label: 'Agent Profiles', href: '/agents' },
      { label: 'Properties', href: '/buy' },
      { label: '3D Tours', href: '/services/3d-tours' },
      { label: 'AIPro™ verification', href: '/services/ai-analytics' },
    ],
    packages: [
      {
        name: 'Agent Pro AI Suite',
        subtitle: 'Solo Brokers & Property Consultants',
        price: '₹29,000',
        taxNote: '+ GST Applicable',
        features: [
          { title: 'AIPro™ Verified Agent Badge', description: 'Verified profile scoring highlighting RERA compliance and regional specialization.' },
          { title: '15 Active Verified Listings', description: 'Priority ranking in city search results and AI-matched recommendations.' },
          { title: 'AI Calling Agent Setup + 500 Mins', description: 'Instant buyer inquiry qualification with automated intake and appointment booking.' },
          { title: '1 AI Property Video / Month', description: '12 custom reels per year formatted for WhatsApp Status and Instagram showcase.' },
          { title: 'Direct WhatsApp Lead CRM', description: 'Immediate real-time lead alerts directly sent to your personal WhatsApp.' },
        ],
      },
      {
        name: 'Elite Producer AI Engine',
        subtitle: 'Top Producers & Luxury Specialists',
        price: '₹59,000',
        taxNote: '+ GST Applicable',
        featured: true,
        features: [
          { title: 'AIShield™ Gold Badge & AIPro™ 95+', description: 'Top-tier trust certification displayed across Dubai and India portals.' },
          { title: 'Unlimited Verified Listings + 3D Priority', description: 'Zero listing caps with priority integration into MillionFlats 3D Tour showcases.' },
          { title: 'AI Voice Agent + 1,500 Mins & Live Transfer', description: 'AI qualifies buyers and connects hot prospects live to your phone via call-bridge.' },
          { title: '3 AI Property Videos / Month', description: '36 videos annually tailored for off-plan luxury and high-ticket resale listings.' },
          { title: '1 Targeted Regional HNI Email Blast', description: 'Dedicated showcase sent to 2.5 Lakh active real estate investors in your focus cities.' },
          { title: 'Prime Locality Featured Banner', description: '6 Months exclusive top placement on your target neighborhood/locality page.' },
        ],
      },
    ],
  },
}

export const ECOSYSTEM_PACKAGES = [
  {
    name: 'Verified Partner Suite',
    subtitle: 'Performance-Aligned Category Entry',
    price: '₹19,000 / YEAR',
    taxNote: 'OR Zero Upfront + Performance Rev-Share',
    features: [
      'MillionFlats Verified Partner Badge',
      'Contextual Listing Page Placement',
      'Direct Inbound Qualified Leads',
      'Partner CRM & WhatsApp Alerts',
      'Outcome-Driven Model',
    ],
  },
  {
    name: 'Category Dominance 360°',
    subtitle: 'Exclusive Industry Leadership & High-Volume Leads',
    price: '₹1,25,000 / YEAR',
    taxNote: '+ GST Applicable (Custom Enterprise Retainer Available)',
    featured: true,
    features: [
      'Guaranteed Top-3 Category Placement',
      'AIShield™ Ecosystem Endorsement',
      'AI Calling Agent + 1,500 Qualification Mins',
      '12 Months High-Traffic Category Banner',
      'Co-Marketing in 2 Mega Investor Blasts',
      'Direct CRM Webhook & Dedicated Support',
    ],
  },
]