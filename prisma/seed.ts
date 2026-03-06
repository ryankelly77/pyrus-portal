import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Products data (root, growth, cultivation categories only)
const productsData = [
  // Root Services
  {
    name: 'Business Branding Foundation',
    short_description: 'Establish a professional brand identity that helps customers remember, trust, and choose your business.',
    long_description: 'Establish a professional brand identity that helps customers remember, trust, and choose your business.',
    category: 'root',
    monthly_price: 99,
    onetime_price: 899,
    sort_order: 1,
  },
  {
    name: 'Seed Site',
    short_description: 'A fast, affordable website solution powered by AI technology to get your business online quickly.',
    category: 'root',
    monthly_price: 249,
    onetime_price: 0,
    sort_order: 2,
  },
  {
    name: 'Sprout Site',
    short_description: 'A professional starter WordPress website to establish your digital presence.',
    category: 'root',
    monthly_price: 300,
    onetime_price: 3000,
    sort_order: 3,
    requires: 'WordPress Care Plan',
  },
  {
    name: 'Bloom Site',
    short_description: 'A complete business website with enhanced features and expanded content areas.',
    category: 'root',
    monthly_price: 450,
    onetime_price: 4500,
    sort_order: 4,
    requires: 'WordPress Care Plan',
  },
  {
    name: 'Harvest Site',
    short_description: 'A comprehensive digital platform with advanced functionality and custom features.',
    category: 'root',
    monthly_price: 600,
    onetime_price: 6000,
    sort_order: 5,
    requires: 'WordPress Care Plan',
  },
  {
    name: 'WordPress Care Plan',
    short_description: 'Secure, updated hosting for WordPress sites.',
    category: 'root',
    monthly_price: 49,
    onetime_price: 0,
    sort_order: 6,
  },
  {
    name: 'Website Care Plan',
    short_description: 'Keep your website healthy and thriving. We handle all of your website updates for you.',
    category: 'root',
    monthly_price: 149,
    onetime_price: 0,
    sort_order: 7,
  },
  {
    name: 'Analytics Tracking',
    short_description: 'GA4 setup and marketing performance dashboards.',
    category: 'root',
    monthly_price: 99,
    onetime_price: 0,
    sort_order: 8,
  },

  // Growth Services
  {
    name: 'AI Visibility Foundation',
    short_description: 'Help AI assistants find and recommend your business.',
    category: 'growth',
    monthly_price: 300,
    onetime_price: 3000,
    sort_order: 1,
  },
  {
    name: 'AI Visibility Monitoring',
    short_description: 'Track how AI platforms find and recommend you—with monthly reports and competitive intelligence.',
    category: 'growth',
    monthly_price: 299,
    onetime_price: 0,
    sort_order: 2,
    requires: 'AI Visibility Foundation',
  },
  {
    name: 'Google Business Profile Optimization',
    short_description: 'Local search visibility and profile management.',
    category: 'growth',
    monthly_price: 199,
    onetime_price: 0,
    supports_quantity: true,
    sort_order: 3,
  },
  {
    name: 'Seedling SEO Plan',
    short_description: 'Foundational on-page SEO & performance tracking.',
    category: 'growth',
    monthly_price: 599,
    onetime_price: 0,
    sort_order: 4,
  },
  {
    name: 'Harvest SEO Plan',
    short_description: 'Advanced SEO with content, link building & authority signals.',
    category: 'growth',
    monthly_price: 1799,
    onetime_price: 0,
    sort_order: 5,
  },
  {
    name: 'Content Writing',
    short_description: 'Monthly 1,000-word SEO-optimized article.',
    category: 'growth',
    monthly_price: 99,
    onetime_price: 0,
    supports_quantity: true,
    sort_order: 6,
  },
  {
    name: 'Organic Social Media',
    short_description: 'Consistent, engaging content across your social platforms that builds authentic connections with your audience.',
    category: 'growth',
    monthly_price: 699,
    onetime_price: 0,
    sort_order: 7,
  },
  {
    name: 'Paid Social Media',
    short_description: 'Strategic paid campaigns that put your business in front of ready-to-buy customers across multiple platforms.',
    category: 'growth',
    monthly_price: 699,
    onetime_price: 0,
    sort_order: 8,
  },
  {
    name: 'Complete Social Media',
    short_description: 'The complete package—organic content builds your reputation while paid campaigns drive immediate results.',
    category: 'growth',
    monthly_price: 999,
    onetime_price: 0,
    sort_order: 9,
  },
  {
    name: 'AI Creative Assets',
    short_description: 'Custom AI-generated images, short-form videos, and premium stock photography to elevate your social content with eye-catching visuals.',
    category: 'growth',
    monthly_price: 298,
    onetime_price: 0,
    sort_order: 10,
  },
  {
    name: 'Google Search Ads',
    short_description: 'Targeted text ads on Google Search.',
    category: 'growth',
    monthly_price: 599,
    onetime_price: 0,
    sort_order: 11,
  },
  {
    name: 'Google Local Service Ads',
    short_description: 'Pay-per-lead ads with Google Guaranteed badge.',
    category: 'growth',
    monthly_price: 149,
    onetime_price: 0,
    sort_order: 12,
  },

  // Cultivation Tools
  {
    name: 'CRM & Lead Tracking',
    short_description: 'Mobile-friendly system to track and convert leads.',
    category: 'cultivation',
    monthly_price: 99,
    onetime_price: 0,
    sort_order: 1,
  },
  {
    name: 'Appointment Setting',
    short_description: 'Booking calendar with calendar integrations.',
    category: 'cultivation',
    monthly_price: 99,
    onetime_price: 0,
    sort_order: 2,
    requires: 'CRM & Lead Tracking',
  },
  {
    name: 'Email & SMS Reminders',
    short_description: 'Automated customer communication.',
    category: 'cultivation',
    monthly_price: 99,
    onetime_price: 0,
    sort_order: 3,
    requires: 'Appointment Setting',
  },
  {
    name: 'Web Chat',
    short_description: 'Lead capture from website directly to your phone.',
    category: 'cultivation',
    monthly_price: 99,
    onetime_price: 0,
    sort_order: 4,
  },
  {
    name: 'Conversational AI Chat',
    short_description: 'Smart chatbot trained on your business content.',
    category: 'cultivation',
    monthly_price: 99,
    onetime_price: 0,
    sort_order: 5,
    requires: 'Web Chat',
  },
  {
    name: 'Review Management',
    short_description: 'Automated collection and response for Google/Facebook reviews.',
    category: 'cultivation',
    monthly_price: 99,
    onetime_price: 0,
    sort_order: 6,
  },
]

// Bundles data
const bundlesData = [
  {
    name: 'Seed Plan',
    description: 'Google Business Profile Optimization, Google Local Service Ads, Analytics Tracking, CRM + Lead Tracking.',
    monthly_price: 249,
    onetime_price: 0,
  },
  {
    name: 'Grow Plan',
    description: 'All Seed features + Seedling SEO.',
    monthly_price: 499,
    onetime_price: 0,
  },
  {
    name: 'Harvest Plan',
    description: 'All Grow features + Harvest SEO + Google Search Ads.',
    monthly_price: 999,
    onetime_price: 0,
  },
]

// Addons data (fertilizer)
const addonsData = [
  {
    name: 'Nitrogen',
    description: 'Appointment Setting + Web Chat.',
    price: 99,
  },
  {
    name: 'Phosphorous',
    description: 'Adds Email & SMS Reminders.',
    price: 199,
  },
  {
    name: 'Potassium',
    description: 'Adds AI Chat + Review Management.',
    price: 499,
  },
]

// Clients data (status must be 'active' or 'inactive' per DB constraint)
const clientsData = [
  {
    name: 'TC Clinical Services',
    contact_email: 'dlg.mdservices@gmail.com',
    status: 'active',
  },
  {
    name: 'Raptor Vending',
    contact_email: 'info@raptorvending.com',
    status: 'active',
  },
  {
    name: 'Raptor Services',
    contact_email: 'contact@raptorservices.com',
    status: 'active',
  },
  {
    name: 'Gohfr',
    contact_email: 'hello@gohfr.com',
    status: 'active',
  },
  {
    name: 'Espronceda Law',
    contact_email: 'maria@espronceda.law',
    status: 'active',
  },
  {
    name: 'American Fence & Deck',
    contact_email: 'sales@americanfence.com',
    status: 'active',
  },
  {
    name: 'Peak Performance Gym',
    contact_email: 'owner@peakperformancegym.com',
    status: 'active',
  },
  {
    name: 'Sunrise Dental',
    contact_email: 'dr.smith@sunrisedental.com',
    status: 'active',
  },
  {
    name: 'Metro Plumbing',
    contact_email: 'dispatch@metroplumbing.com',
    status: 'active',
  },
  {
    name: 'Green Thumb Landscaping',
    contact_email: 'info@greenthumb.com',
    status: 'active',
  },
  {
    name: 'Horizon Real Estate',
    contact_email: 'broker@horizonre.com',
    status: 'active',
  },
  {
    name: 'Coastal Insurance',
    contact_email: 'agent@coastalins.com',
    status: 'active',
  },
]

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.product_dependencies.deleteMany()
  await prisma.addon_products.deleteMany()
  await prisma.bundle_products.deleteMany()
  await prisma.free_products.deleteMany()
  await prisma.addons.deleteMany()
  await prisma.bundles.deleteMany()
  await prisma.products.deleteMany()

  console.log('Cleared existing data')

  // Create products (without dependencies first)
  const createdProducts: Record<string, string> = {}

  for (const product of productsData) {
    const { requires, ...productData } = product
    const created = await prisma.products.create({
      data: {
        name: productData.name,
        short_description: productData.short_description,
        long_description: productData.long_description || null,
        category: productData.category,
        monthly_price: productData.monthly_price,
        onetime_price: productData.onetime_price,
        supports_quantity: productData.supports_quantity || false,
        sort_order: productData.sort_order,
        status: 'active',
      },
    })
    createdProducts[product.name] = created.id
    console.log(`Created product: ${product.name}`)
  }

  // Create product dependencies
  for (const product of productsData) {
    if (product.requires) {
      const productId = createdProducts[product.name]
      const requiresProductId = createdProducts[product.requires]

      if (productId && requiresProductId) {
        await prisma.product_dependencies.create({
          data: {
            product_id: productId,
            requires_product_id: requiresProductId,
          },
        })
        console.log(`Created dependency: ${product.name} requires ${product.requires}`)
      }
    }
  }

  // Create bundles
  for (const bundle of bundlesData) {
    await prisma.bundles.create({
      data: {
        name: bundle.name,
        description: bundle.description,
        monthly_price: bundle.monthly_price,
        onetime_price: bundle.onetime_price,
        status: 'active',
      },
    })
    console.log(`Created bundle: ${bundle.name}`)
  }

  // Create addons
  for (const addon of addonsData) {
    await prisma.addons.create({
      data: {
        name: addon.name,
        description: addon.description,
        price: addon.price,
        status: 'active',
      },
    })
    console.log(`Created addon: ${addon.name}`)
  }

  // Clear existing clients
  await prisma.clients.deleteMany()
  console.log('Cleared existing clients')

  // Create clients
  for (const client of clientsData) {
    await prisma.clients.create({
      data: {
        name: client.name,
        contact_email: client.contact_email,
        status: client.status,
      },
    })
    console.log(`Created client: ${client.name}`)
  }

  // Seed Raptor Vending Harvest Report with full chart data
  const raptorClient = await prisma.clients.findFirst({
    where: { name: { contains: 'Raptor Vending', mode: 'insensitive' } },
  })

  if (raptorClient) {
    // Delete existing reports for clean re-seed
    await prisma.report_sections.deleteMany({
      where: { report: { client_id: raptorClient.id } },
    })
    await prisma.campaign_reports.deleteMany({
      where: { client_id: raptorClient.id },
    })

    const report = await prisma.campaign_reports.create({
      data: {
        client_id: raptorClient.id,
        title: 'Q1 2025 Harvest Report — Months 1–3',
        period_label: 'Months 1–3 · Nov 2024 – Jan 2025',
        period_start: new Date('2024-11-01'),
        period_end: new Date('2025-01-31'),
        campaign_month: 3,
        service_types: ['SEO', 'Local SEO', 'GBP'],
        status: 'published',
        published_at: new Date('2025-02-01'),
        manager_name: 'Ryan',
        manager_note:
          'Strong start for Raptor Vending. Local SEO foundation is fully in place, GBP is optimized, and keyword growth is accelerating. The vending machine vertical has low competition — expect top-10 rankings for core terms by month 6.',
      },
    })

    // Create report sections with full chart data
    const sections = [
      {
        section_type: 'search_visibility',
        sort_order: 0,
        data: {
          currentImpressions: 4200,
          previousImpressions: 1100,
          currentClicks: 180,
          previousClicks: 48,
          currentCTR: 4.3,
          previousCTR: 4.4,
          currentAvgPosition: 28.4,
          previousAvgPosition: 44.2,
          monthlyHistory: [
            { month: 'Aug 24', impressions: 320, clicks: 14, isPreCampaign: true },
            { month: 'Sep 24', impressions: 580, clicks: 26, isPreCampaign: true },
            { month: 'Oct 24', impressions: 900, clicks: 38, isPreCampaign: true },
            { month: 'Nov 24', impressions: 1400, clicks: 60, isCampaignStart: true },
            { month: 'Dec 24', impressions: 2600, clicks: 110 },
            { month: 'Jan 25', impressions: 4200, clicks: 180 },
          ],
        },
      },
      {
        section_type: 'organic_traffic',
        sort_order: 1,
        data: {
          currentUsers: 340,
          previousUsers: 112,
          currentSessions: 420,
          previousSessions: 138,
          monthlyHistory: [
            { month: 'Aug 24', users: 42, isPreCampaign: true },
            { month: 'Sep 24', users: 68, isPreCampaign: true },
            { month: 'Oct 24', users: 95, isPreCampaign: true },
            { month: 'Nov 24', users: 140, isCampaignStart: true },
            { month: 'Dec 24', users: 230 },
            { month: 'Jan 25', users: 340 },
          ],
        },
      },
      {
        section_type: 'keyword_rankings',
        sort_order: 2,
        data: {
          totalTracked: 45,
          top3: 0,
          top3Delta: 0,
          top10: 2,
          top10Delta: 2,
          top20: 8,
          top20Delta: 8,
          top30: 14,
          top30Delta: 14,
          top100: 28,
          top100Delta: 28,
          totalImproved: 28,
          notRanking: 17,
        },
      },
      {
        section_type: 'keyword_growth',
        sort_order: 3,
        data: {
          months: [
            { label: 'Aug 24', top3: 0, pos4to20: 0, pos21to50: 2, pos51to100: 4, serpFeatures: 0, isPreCampaign: true },
            { label: 'Sep 24', top3: 0, pos4to20: 0, pos21to50: 3, pos51to100: 8, serpFeatures: 0, isPreCampaign: true },
            { label: 'Oct 24', top3: 0, pos4to20: 1, pos21to50: 5, pos51to100: 12, serpFeatures: 0, isPreCampaign: true },
            { label: 'Nov 24', top3: 0, pos4to20: 2, pos21to50: 8, pos51to100: 18, serpFeatures: 40, isCampaignStart: true },
            { label: 'Dec 24', top3: 0, pos4to20: 5, pos21to50: 12, pos51to100: 22, serpFeatures: 80 },
            { label: 'Jan 25', top3: 0, pos4to20: 8, pos21to50: 14, pos51to100: 28, serpFeatures: 120 },
          ],
        },
      },
      {
        section_type: 'link_building',
        sort_order: 4,
        data: {
          campaignTotal: 90,
          months: [
            { month: 'Nov 2024', contextual: 10, guestPosts: 5, web2: 15, other: 0 },
            { month: 'Dec 2024', contextual: 12, guestPosts: 5, web2: 15, other: 0 },
            { month: 'Jan 2025', contextual: 14, guestPosts: 6, web2: 8, other: 0 },
          ],
          totalContextual: 36,
          totalGuestPosts: 16,
          totalWeb2: 38,
          totalOther: 0,
        },
      },
      {
        section_type: 'local_seo',
        sort_order: 5,
        data: {
          monthlyPosts: [
            { month: 'Nov', count: 12 },
            { month: 'Dec', count: 14 },
            { month: 'Jan', count: 16 },
          ],
          notes:
            'GBP fully optimized: 40+ photos, all services listed, 3 Q&As added, citations submitted to 52 directories. Posts focus on office building and manufacturing verticals in San Antonio.',
        },
      },
      {
        section_type: 'review_management',
        sort_order: 6,
        data: {
          platforms: [
            {
              platform: 'Google',
              currentRating: 4.9,
              previousRating: 4.9,
              currentTotal: 8,
              previousTotal: 6,
              newThisPeriod: 2,
            },
          ],
          monthlyReviews: [
            { month: 'Nov', google: 1 },
            { month: 'Dec', google: 0 },
            { month: 'Jan', google: 1 },
          ],
        },
      },
      {
        section_type: 'technical_audit',
        sort_order: 7,
        data: {
          issues: [
            { title: 'Site Speed (Mobile)', description: 'Core Web Vitals optimized — LCP improved from 4.2s to 2.1s.', status: 'resolved' },
            { title: 'Schema Markup', description: 'LocalBusiness and Product schema added to all service pages.', status: 'resolved' },
            { title: 'Missing Alt Tags (12 images)', description: 'Alt tags added to all product and location images.', status: 'resolved' },
            { title: 'Internal Linking', description: 'Silo structure being built out for vending machine categories.', status: 'in_progress' },
          ],
        },
      },
      {
        section_type: 'ai_visibility',
        sort_order: 8,
        data: {
          platforms: [
            { platform: 'ChatGPT', mentioned: false, visibilityScore: 18, sentiment: 'neutral', notes: 'Not yet indexed for San Antonio vending queries' },
            { platform: 'Google Gemini', mentioned: false, visibilityScore: 22, sentiment: 'neutral', notes: 'Monitoring — GBP signals increasing' },
            { platform: 'Perplexity', mentioned: false, visibilityScore: 12, sentiment: 'neutral', notes: 'No citations yet' },
          ],
          queriesTracked: 8,
          queriesMentioned: 0,
          notes: 'AI visibility is expected to be low in months 1–3. As domain authority grows and content is indexed, expect improvement by month 6–9.',
        },
      },
      {
        section_type: 'coming_next',
        sort_order: 9,
        data: {
          items: [
            {
              title: 'Office Vending Content Silo',
              description: 'Building 6 pages targeting "office vending San Antonio," "smart fridge rental," and related commercial queries.',
              iconColor: 'teal',
            },
            {
              title: 'Citation Cleanup & Expansion',
              description: 'NAP consistency audit + submit to 20 additional industry-specific directories.',
              iconColor: 'blue',
            },
            {
              title: 'Link Velocity Increase',
              description: 'Scaling from 30 to 50 links/month with focus on commercial real estate and facilities management verticals.',
              iconColor: 'green',
            },
            {
              title: 'Review Generation Campaign',
              description: 'QR code + email sequence targeting existing Finesilver and Landmark One contacts for Google reviews.',
              iconColor: 'orange',
            },
          ],
        },
      },
    ]

    for (const section of sections) {
      await prisma.report_sections.create({
        data: {
          report_id: report.id,
          section_type: section.section_type,
          sort_order: section.sort_order,
          data: section.data,
        },
      })
    }

    console.log('✓ Raptor Vending report seeded with full chart data (10 sections)')
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
