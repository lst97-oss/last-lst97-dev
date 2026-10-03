/**
 * Copy and pricing for the public /services page.
 *
 * Every price, bullet and note the page renders lives here so the route and the
 * components stay presentational, and so the quoted figures have exactly one
 * place to change. Prices are display strings on purpose — they are starting
 * points ("From A$1,000"), never arithmetic — and the numeric amounts the JSON-LD
 * Offer nodes need are kept alongside in `SERVICE_PACKAGE_PRICE_AMOUNT` rather
 * than parsed back out of the label.
 *
 * Client-safe: plain data and types, no React and no `src/server` imports.
 */

export interface ServicePackage {
  slug: 'starter' | 'business' | 'business-plus'
  name: string
  tagline: string
  /** Display price, always a "From A$…" starting point. */
  price: string
  bestFor: string
  /** Three or four decision-making features shown before the full inclusions. */
  highlights: string[]
  /** Inclusions specific to this tier; a tier with `inherits` lists only its own. */
  includes: string[]
  /** Slug of the tier whose inclusions this one builds on. */
  inherits?: 'starter' | 'business'
  /** The single recommended tier. Renders the highlighted card treatment. */
  emphasis?: boolean
}

export interface ServiceAddOn {
  name: string
  price: string
}

export interface ServiceProcessStep {
  title: string
  summary: string
}

export interface ServiceInfoSection {
  id: string
  title: string
  /** Maps to one of the muted background utilities already in use on /contact. */
  tone: 'info' | 'warning' | 'success' | 'error'
  lead: string
  items: string[]
}

/**
 * A technical support engagement for an application that already exists.
 * Distinct from `ServicePackage`: a package builds a new website, while a
 * support plan fixes, configures, or deploys one the client already has.
 */
export interface ServiceSupportPlan {
  slug: string
  name: string
  /** Display price, always a "From A$…" starting point or an hourly rate. */
  price: string
  bestFor: string
  /**
   * Optional override for the always-visible bullets. Omit it and the card
   * shows the first three `items`; set it only when a different subset should
   * lead, which nothing currently needs.
   */
  highlights?: string[]
  items: string[]
}

/** One engagement inside a price group. The plan minus its now-shared price. */
export interface ServiceSupportEngagement {
  slug: string
  name: string
  bestFor: string
  /**
   * Two or three bullets shown without expanding anything. The first three of
   * `items` by default: a card that opened with a nine-item list read as a
   * wall of text and pushed the price comparison below the fold.
   */
  highlights: string[]
  /** The full list, revealed by the card's disclosure. */
  items: string[]
}

export const SERVICE_SECTION_HEADING = 'Website Packages'

export const SERVICE_OVERVIEW =
  'Professional websites designed and developed for small businesses, independent professionals, and growing brands. Each website is built to be responsive, maintainable, fast, and easy to manage, using modern development practices and production-ready deployment.'

export const SERVICE_PRICING_NOTE =
  'Final pricing depends on the agreed project scope, required functionality, number of pages, integrations, and content requirements.'

/**
 * Geography notice shown on /services and mirrored in the retrieval corpus.
 * Prices are quoted in Australian dollars because that is where the business
 * is based today; remote work beyond Australia is planned rather than offered,
 * so the wording states the plan without promising availability.
 */
export const SERVICE_LOCATION_NOTE =
  'Services are currently offered in Australia, with all prices in Australian dollars (A$). Remote work for clients outside Australia is planned and will expand in the future — contact me to discuss your location and requirements.'

export const RECOMMENDED_PACKAGE_SLUG = 'business'

export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    slug: 'starter',
    name: 'Starter',
    tagline: 'A professional online presence, without the complexity.',
    price: 'From A$1,000',
    bestFor:
      'Small businesses, trades and service providers, personal brands, portfolio websites, and simple company websites.',
    highlights: [
      'Up to 5 standard pages',
      'Responsive desktop, tablet and mobile development',
      'Contact form',
      'Basic technical SEO',
    ],
    includes: [
      'Up to 5 standard pages',
      'Responsive desktop, tablet and mobile development',
      'Homepage',
      'About page',
      'Services or information pages',
      'Contact page',
      'Contact form',
      'Basic technical SEO',
      'Metadata configuration',
      'Sitemap',
      'robots.txt',
      'Production deployment',
      'Domain configuration assistance',
      'Responsive and browser testing',
      'Two revision rounds',
    ],
  },
  {
    slug: 'business',
    name: 'Business',
    tagline: 'A complete business website you can run yourself.',
    price: 'From A$2,200',
    bestFor:
      'Established small businesses, professional service providers, businesses publishing regular content, companies requiring an easy-to-manage website, and marketing-focused websites.',
    highlights: [
      'Customised user interface',
      'Headless CMS and blog',
      'Contact and transactional email integration',
      'Enhanced SEO and analytics',
    ],
    inherits: 'starter',
    emphasis: true,
    includes: [
      'Customised user interface',
      'Headless CMS integration',
      'Blog system',
      'Blog listing page',
      'Individual article pages',
      'CMS content modelling',
      'Contact and transactional email integration',
      'Basic structured data',
      'Enhanced technical SEO',
      'Analytics integration',
      'Social sharing metadata',
      'Content management interface',
      'Production environment configuration',
      'Two revision rounds',
    ],
  },
  {
    slug: 'business-plus',
    name: 'Business+',
    tagline: 'Advanced functionality and content management.',
    price: 'From A$3,500',
    bestFor:
      'Businesses requiring a more customised website, additional functionality, or advanced content management.',
    highlights: [
      'Advanced custom UI',
      'Advanced CMS and content types',
      'Third-party and API integrations',
      'Advanced forms and custom business logic',
    ],
    inherits: 'business',
    includes: [
      'Advanced custom UI',
      'Additional pages',
      'Custom animations and interactions',
      'Advanced CMS structures',
      'Multiple content types',
      'Third-party service integrations',
      'API integrations',
      'Advanced forms',
      'Dynamic website sections',
      'Custom business logic',
      'More complex deployment requirements',
    ],
  },
]

/**
 * Numeric AUD amounts for the JSON-LD `Offer` nodes. schema.org requires a
 * number for `price`; the human-readable label stays on `ServicePackage.price`.
 */
export const SERVICE_PACKAGE_PRICE_AMOUNT: Record<ServicePackage['slug'], number> = {
  starter: 1000,
  business: 2200,
  'business-plus': 3500,
}

export const SERVICE_ADDONS: ServiceAddOn[] = [
  { name: 'Additional standard page', price: 'From A$100' },
  { name: 'Advanced contact or enquiry form', price: 'From A$200' },
  { name: 'Additional CMS content type', price: 'From A$150' },
  { name: 'Custom animation or interaction', price: 'From A$200' },
  { name: 'Third-party API integration', price: 'From A$300' },
  { name: 'Content migration', price: 'Quoted based on scope' },
  { name: 'Additional revision round', price: 'From A$100' },
  { name: 'Ongoing maintenance', price: 'From A$50/hour' },
]

export const SERVICE_ADDONS_NOTE =
  'These prices are indicative starting points. Complex requirements may require a separate quotation.'

export const SERVICE_SUPPORT_SECTION_HEADING = 'Go Support Plan'

export const SERVICE_SUPPORT_OVERVIEW =
  'Affordable technical help for websites and applications that already exist. For businesses, founders, and individuals who have a site or app that needs fixing, improving, or deploying — especially projects built with AI-assisted tools such as Cursor, Claude Code, Lovable, Bolt, Replit, v0, and GitHub Copilot.'

export const SERVICE_SUPPORT_PLANS: ServiceSupportPlan[] = [
  {
    slug: 'technical-consultation',
    name: 'Technical Consultation',
    price: 'From A$40 / hour',
    bestFor: 'Understanding what is wrong before committing to any development work.',
    items: [
      'Why a website is not deploying',
      'Which hosting platform to use',
      'Whether an application is production-ready',
      'Why a build or runtime error is happening',
      'How to configure a domain or DNS',
      'How to connect a database',
      'How to configure environment variables',
      'Whether the existing architecture should change',
      'What needs fixing before launch',
    ],
  },
  {
    slug: 'production-readiness-review',
    name: 'Production Readiness Review',
    price: 'From A$100',
    bestFor: 'Finding out whether a project is ready to launch, before it goes live.',
    items: [
      'Build configuration',
      'Environment variables and production secrets',
      'Obvious security issues',
      'Database configuration',
      'Authentication setup',
      'Deployment architecture',
      'Error handling',
      'SEO basics and mobile responsiveness',
    ],
  },
  {
    slug: 'deployment-support',
    name: 'Deployment / Deployment Fix',
    price: 'From A$100',
    bestFor: 'Putting a working application online, or fixing one that works locally but fails in production.',
    items: [
      'Vercel, Cloudflare, Netlify, Railway, Render, or VPS deployment',
      'GitHub repository connection and build configuration',
      'Environment variables and production secrets',
      'Domain connection, DNS configuration, and SSL setup',
      'Basic production testing',
      'Failed production builds and runtime compatibility issues',
    ],
  },
  {
    slug: 'bug-fixes',
    name: 'Bug Fix',
    price: 'From A$100',
    bestFor: 'Small development and production issues handled as fixed-price tasks.',
    items: [
      'Broken contact forms and API requests',
      'TypeScript errors and dependency problems',
      'Responsive layout issues',
      'Authentication problems',
      'Image loading, broken routes, form validation',
      'Production-only errors',
    ],
  },
  {
    slug: 'domain-dns-hosting',
    name: 'Domain / DNS / Hosting Setup',
    price: 'From A$100',
    bestFor: 'Making a deployed application answer on its public domain.',
    items: [
      'Custom domain connection and subdomains',
      'Cloudflare DNS setup',
      'SSL configuration and redirects',
      'Email DNS records',
      'Hosting and CDN configuration',
    ],
  },
  {
    slug: 'small-features',
    name: 'Small Feature Implementation',
    price: 'From A$100',
    bestFor: 'Adding a contained feature to an existing application without a rebuild.',
    items: [
      'Contact forms and email sending',
      'Analytics and SEO metadata',
      'Basic CMS integration and sitemap generation',
      'Third-party API integration and cookie consent',
      'Simple authentication and file uploads',
      'Small dashboard features and responsive improvements',
    ],
  },
  {
    slug: 'cms-api-integration',
    name: 'CMS / API Integration',
    price: 'From A$100',
    bestFor: 'Connecting or repairing a content system or external API in an existing application.',
    items: [
      'Payload CMS, Sanity, Contentful, Strapi, Supabase',
      'REST APIs and external SaaS APIs',
      'Email providers and analytics services',
    ],
  },
  {
    slug: 'database-backend',
    name: 'Database / Backend Support',
    price: 'From A$100',
    bestFor: 'Smaller backend configuration or repair tasks.',
    items: [
      'PostgreSQL configuration and Supabase integration',
      'Database connection issues and environment setup',
      'Basic schema changes and simple migration problems',
      'API configuration',
    ],
  },
  {
    slug: 'migration-major-changes',
    name: 'Migration / Major Refactor',
    price: 'Custom Quote',
    bestFor: 'Work that needs more than a deployment fix.',
    items: [
      'Hosting or framework migration',
      'Database migration and major dependency upgrades',
      'Authentication redesign and significant refactoring',
      'Dockerisation and CI/CD restructuring',
      'Infrastructure redesign',
    ],
  },
]

/**
 * Numeric AUD figures for the JSON-LD `Offer` nodes, keyed by plan slug
 * because the slug is the stable identity. `ServiceSupportPlan.price` stays the
 * human-readable label and is never parsed back into a number.
 *
 * "Migration & Major Changes" is absent on purpose: it is `Custom Quote` with
 * no figure, and emitting 0 would advertise the work as free.
 */
export const SUPPORT_TIER_PRICE_AMOUNT: Record<ServiceSupportPlan['slug'], number | undefined> = {
  'technical-consultation': 40,
  'production-readiness-review': 100,
  'deployment-support': 100,
  'bug-fixes': 100,
  'domain-dns-hosting': 100,
  'small-features': 100,
  'cms-api-integration': 100,
  'database-backend': 100,
  'migration-major-changes': undefined,
}

/**
/** How many bullets a card shows before its disclosure is opened. */
const SUPPORT_HIGHLIGHT_COUNT = 3

/**
 * Support work has one standard implementation price. The page pairs the
 * required hourly consultation with that standard engagement, then shows
 * migration work as a separate custom quote. `SERVICE_SUPPORT_PLANS` stays
 * flat and authoritative for the JSON-LD offers, the quotation email, and the
 * corpus parity guard, all of which address a single engagement.
 */
/** The base the standard engagement sits on: diagnose first, then fix. */
export const SERVICE_SUPPORT_CONSULTATION_RATE = 'A$40'

/**
 * The consultation slug. It is hourly and is deliberately excluded from the
 * A$100 card: it is the "+" base beneath it, not one of the fixed engagements,
 * and listing it in both places implied it was billed at both rates.
 */
export const SERVICE_SUPPORT_CONSULTATION_SLUG = 'technical-consultation'

export const SERVICE_SUPPORT_CONSULTATION_NOTE =
  'You can book a consultation on its own, with no commitment to implementation. If you choose support work, the consultation comes first and is billed separately from implementation. For larger projects, the fee may be credited toward implementation; eligibility is confirmed in the quotation.'

export const SERVICE_SUPPORT_STANDARD_PRICE = 'A$100'

export const SERVICE_SUPPORT_STANDARD_SUMMARY =
  'A bounded fix to something that already exists. One standard rate, because a deployment, a bug fix, and a database repair are the same kind of work.'

export const SERVICE_SUPPORT_CUSTOM_SLUG = 'migration-major-changes'

/** Everything billed at the standard rate, in the order the page lists them. */
export const SERVICE_SUPPORT_STANDARD_PLANS: ServiceSupportEngagement[] = SERVICE_SUPPORT_PLANS.filter(
  (plan) => plan.slug !== SERVICE_SUPPORT_CUSTOM_SLUG && plan.slug !== SERVICE_SUPPORT_CONSULTATION_SLUG,
).map((plan) => ({
  slug: plan.slug,
  name: plan.name,
  bestFor: plan.bestFor,
  highlights: plan.highlights ?? plan.items.slice(0, SUPPORT_HIGHLIGHT_COUNT),
  items: plan.items,
}))

/** The hourly consultation, rendered as the "+" base card. */
export const SERVICE_SUPPORT_CONSULTATION_PLANS: ServiceSupportEngagement[] = SERVICE_SUPPORT_PLANS.filter(
  (plan) => plan.slug === SERVICE_SUPPORT_CONSULTATION_SLUG,
).map((plan) => ({
  slug: plan.slug,
  name: plan.name,
  bestFor: plan.bestFor,
  highlights: plan.highlights ?? plan.items.slice(0, SUPPORT_HIGHLIGHT_COUNT),
  items: plan.items,
}))

/** Migration work, which is quoted individually and rendered in its own card. */
export const SERVICE_SUPPORT_CUSTOM_PLANS: ServiceSupportEngagement[] = SERVICE_SUPPORT_PLANS.filter(
  (plan) => plan.slug === SERVICE_SUPPORT_CUSTOM_SLUG,
).map((plan) => ({
  slug: plan.slug,
  name: plan.name,
  bestFor: plan.bestFor,
  highlights: plan.highlights ?? plan.items.slice(0, SUPPORT_HIGHLIGHT_COUNT),
  items: plan.items,
}))
export const SERVICE_SUPPORT_PRICING_NOTE =
  'All prices are starting prices and may vary depending on project complexity. The A$100 figure is the standard rate for a single bounded support engagement, not a per-hour rate. Third-party hosting, domain, infrastructure, API, SaaS, or subscription costs are not included unless specifically stated in the quotation.'

export const SERVICE_SUPPORT_SCOPE_NOTE =
  'A standard support engagement assumes the application is already generally functional. Major code refactoring, database redesign, large framework migrations, extensive dependency upgrades, authentication redesign, major security remediation, infrastructure redesign, and significant data migration are normally outside standard scope. If any of these are discovered during the review, the issue is explained and a separate quote is provided before proceeding.'

export const SERVICE_SUPPORT_PROCESS: ServiceInfoSection[] = [
  {
    id: 'consultation',
    title: '1. Consultation or review',
    tone: 'info',
    lead: 'The issue, requirements, or existing application is inspected first.',
    items: [
      'Consultations start from A$40 per hour.',
      'For larger projects the consultation fee may be credited toward the implementation cost.',
    ],
  },
  {
    id: 'diagnosis',
    title: '2. Diagnosis',
    tone: 'info',
    lead: 'The likely cause, recommended solution, and implementation requirements are identified.',
    items: [
      'The price depends on the cause rather than the symptom.',
      'No implementation work starts before a quote is approved.',
    ],
  },
  {
    id: 'quote',
    title: '3. Fixed-price quote',
    tone: 'info',
    lead: 'For straightforward work, a fixed implementation price is provided.',
    items: ['Typical implementation work starts from A$100.'],
  },
  {
    id: 'implementation',
    title: '4. Implementation',
    tone: 'success',
    lead: 'Once approved, the required fixes, deployment, migration, or feature work is completed.',
    items: ['Scope is agreed before work begins.'],
  },
  {
    id: 'verification',
    title: '5. Verification',
    tone: 'success',
    lead: 'The completed work is tested against the agreed scope before handover.',
    items: ['Anything discovered outside the agreed scope is raised before further work begins.'],
  },
]

export const SERVICE_PROCESS_STEPS: ServiceProcessStep[] = [
  {
    title: 'Project Discovery',
    summary: 'We confirm the requirements that become the project scope before development begins.',
  },
  {
    title: 'Design & Structure',
    summary: 'The layout, visual direction and content structure are prepared from the agreed requirements.',
  },
  {
    title: 'Development',
    summary: 'The website is implemented with a modern stack and responsive behaviour across every breakpoint.',
  },
  {
    title: 'CMS & Integrations',
    summary:
      'Where required, content management, email, analytics, forms and integrations are configured to the agreed scope.',
  },
  {
    title: 'Testing',
    summary: 'The website is tested before production launch.',
  },
  {
    title: 'Review & Revisions',
    summary: 'The completed website is provided for client review, with two revision rounds included.',
  },
  {
    title: 'Launch',
    summary: 'Following approval, the website is deployed to the production environment.',
  },
]

export const SERVICE_TECHNOLOGIES: string[] = [
  'React',
  'Next.js',
  'TanStack Start',
  'TypeScript',
  'Tailwind CSS',
  'Headless CMS platforms',
  'Cloudflare',
  'Vercel',
  'Resend',
  'Google Analytics',
  'Cloudflare Analytics',
]

export const SERVICE_TECHNOLOGY_NOTE =
  'Technology is selected according to the requirements of each project, so the exact stack may vary. The objective is always the same: a website that is fast, responsive, secure, maintainable, search-engine friendly, easy to manage, and ready for future development.'

export const SERVICE_TERMS: ServiceInfoSection[] = [
  {
    id: 'project-costs',
    title: 'Project costs & scope',
    tone: 'warning',
    lead: 'Know what the starting package price covers and what is quoted separately.',
    items: [
      'The development fee excludes domain and hosting subscriptions, paid CMS or third-party services, professional copywriting or photography, logo or brand design, legal advice or document drafting, large content migrations, ongoing content management, and ongoing maintenance.',
      'Recurring CMS, email, API, plugin, theme, component, licensed-font, stock-photo, analytics and other service fees are separate. Free tiers may suit smaller sites, and expected costs are discussed before implementation.',
      'Advanced animations, additional pages, e-commerce, booking or payment systems, authentication, customer portals, custom backends, advanced forms, CRM or API integrations, search, multiple CMS content types and workflows, dashboards, automation, internal tools, complex deployments or other out-of-scope changes are quoted and approved before work begins.',
    ],
  },
  {
    id: 'content-responsibilities',
    title: 'Content & responsibilities',
    tone: 'info',
    lead: 'You provide the final materials unless your quotation includes content work.',
    items: [
      'You supply business and service information, copy, images, logos and brand assets, contact details, and legal documents such as privacy policies and terms.',
      'Content writing, editing, preparation or migration can be quoted separately.',
    ],
  },
  {
    id: 'revisions-and-scope',
    title: 'Revisions & scope changes',
    tone: 'info',
    lead: 'Every package includes two revision rounds within the agreed scope.',
    items: [
      'One revision round is a consolidated set of reasonable changes, including text and image updates or minor layout, colour, spacing and interface adjustments.',
      'Additional pages, CMS features, integrations or functionality outside the agreed scope are quoted before work begins.',
      'New functionality or a significant redesign is treated as additional work.',
    ],
  },
  {
    id: 'launch-and-support',
    title: 'Launch, handover & support',
    tone: 'success',
    lead: 'Launch handover is included. Ongoing maintenance on a site built here is arranged separately from A$50/hour; technical help for an existing site or application starts from A$40/hour.',
    items: [
      'Handover includes the deployed website, CMS and hosting access, domain information, basic CMS guidance, source-code access, and environment configuration guidance.',
      'Support can cover security and dependency updates, monitoring, content changes, minor fixes, performance work, deployment help, and small improvements.',
      'The ongoing maintenance arrangement depends on the level of help required. A support plan is also available from A$40/hour for sites and applications that were not built here.',
    ],
  },
]

/**
 * Footer CTA copy. Deliberately covers both offerings rather than repeating the
 * package-specific prompt: the tabs above are the place a visitor chooses
 * between a build and a support engagement, so this block has to read as the
 * shared next step for either one.
 */
export const SERVICE_QUOTE_HEADING = 'Every project starts with a conversation.'

export const SERVICE_QUOTE_CTA_NOTE =
  'Tell me which tab you came from — a new website to build, or an existing site or application that needs fixing, improving, or deploying — and I will prepare a fixed-price scope before any work begins.'

export const SERVICE_QUOTE_CTA_BUTTON = 'START THE CONVERSATION'

export const SERVICE_QUOTE_CTA_TAB_HINT =
  'Packages and support engagements are priced separately, so pick the one that matches your project and the quote will reflect it.'

export const SERVICE_QUOTE_PROMPT =
  'For a fixed-price scope, share your business or project name, existing website if applicable, required pages and features, CMS or integration needs, design references, content readiness, and target launch timeframe.'
