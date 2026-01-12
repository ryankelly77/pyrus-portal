/**
 * Seed Demo Client
 *
 * Creates a demo client with all necessary data for showcasing the portal.
 * The demo client has a fixed UUID so it can be easily referenced.
 *
 * This creates a FULLY ACTIVE client with:
 * - Purchased "Best" tier recommendation
 * - Active subscription with all products
 * - Access to Results, Activity, Website, and Content pages
 * - Sample data on all pages
 *
 * Run with: npx tsx scripts/seed-demo-client.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Fixed UUIDs for demo data - these never change
const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_SUBSCRIPTION_ID = '00000000-0000-0000-0000-000000000002'
const DEMO_RECOMMENDATION_ID = '00000000-0000-0000-0000-000000000003'

async function seedDemoClient() {
  console.log('Seeding demo client...')

  // First, clean up any existing demo data
  console.log('Cleaning up existing demo data...')

  await prisma.client_communications.deleteMany({ where: { client_id: DEMO_CLIENT_ID } })
  await prisma.client_onboarding_responses.deleteMany({ where: { client_id: DEMO_CLIENT_ID } })
  await prisma.client_checklist_items.deleteMany({ where: { client_id: DEMO_CLIENT_ID } })
  await prisma.subscription_items.deleteMany({ where: { subscription_id: DEMO_SUBSCRIPTION_ID } })
  await prisma.subscriptions.deleteMany({ where: { id: DEMO_SUBSCRIPTION_ID } })
  await prisma.recommendation_items.deleteMany({ where: { recommendation_id: DEMO_RECOMMENDATION_ID } })
  await prisma.recommendation_invites.deleteMany({ where: { recommendation_id: DEMO_RECOMMENDATION_ID } })
  await prisma.recommendation_history.deleteMany({ where: { recommendation_id: DEMO_RECOMMENDATION_ID } })
  await prisma.recommendations.deleteMany({ where: { id: DEMO_RECOMMENDATION_ID } })
  await prisma.activity_log.deleteMany({ where: { client_id: DEMO_CLIENT_ID } })
  await prisma.content.deleteMany({ where: { client_id: DEMO_CLIENT_ID } })
  await prisma.clients.deleteMany({ where: { id: DEMO_CLIENT_ID } })

  // Create demo client with ALL access fields populated
  // Using Raptor Vending as the demo company
  console.log('Creating demo client with full access...')
  await prisma.clients.create({
    data: {
      id: DEMO_CLIENT_ID,
      name: 'Raptor Vending',
      contact_name: 'Mike Reynolds',
      contact_email: 'mike@raptorvending.com',
      avatar_color: '#DC2626', // Red color for Raptor
      growth_stage: 'blooming',
      status: 'active',
      monthly_spend: 2847,
      start_date: new Date('2024-06-15'),
      notes: 'Demo client for showcasing the portal. All pages have sample data.',
      // These fields enable access to each page:
      agency_dashboard_share_key: 'demo-dashboard-key-12345', // Enables Results page
      basecamp_id: 'demo-basecamp-12345', // Enables Activity page
      landingsite_preview_url: 'https://raptor-vending.com', // Enables Website page
    }
  })

  // Get products for the subscription
  const products = await prisma.products.findMany({ where: { status: 'active' } })

  // Find products by category or name
  const seoProduct = products.find(p => p.category === 'seo')
  const websiteProduct = products.find(p => p.category === 'website' || p.name.toLowerCase().includes('site'))
  const contentProduct = products.find(p => p.category === 'content' || p.name.toLowerCase().includes('content'))
  const socialProduct = products.find(p => p.category === 'social')
  const aiCreativeProduct = products.find(p => p.name.toLowerCase().includes('ai creative') || p.name.toLowerCase().includes('branding'))
  const carePlanProduct = products.find(p => p.name.toLowerCase().includes('care plan'))

  // Create demo recommendation (ACCEPTED with purchased tier)
  console.log('Creating demo recommendation (accepted, best tier)...')
  await prisma.recommendations.create({
    data: {
      id: DEMO_RECOMMENDATION_ID,
      client_id: DEMO_CLIENT_ID,
      status: 'accepted', // Already purchased
      purchased_tier: 'best', // They chose the best tier
      purchased_at: new Date('2024-06-20'),
      total_monthly: 2847,
      total_onetime: 0,
      notes: 'Demo recommendation - purchased Best tier.',
      sent_at: new Date('2024-06-18'),
      responded_at: new Date('2024-06-20'),
    }
  })

  // Add recommendation items for Good/Better/Best tiers
  const recommendationItems = []

  // Good tier - Basic package (SEO + Website)
  if (seoProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: seoProduct.id,
      tier: 'good',
      quantity: 1,
      monthly_price: seoProduct.monthly_price,
      onetime_price: seoProduct.onetime_price,
    })
  }
  if (websiteProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: websiteProduct.id,
      tier: 'good',
      quantity: 1,
      monthly_price: websiteProduct.monthly_price,
      onetime_price: websiteProduct.onetime_price,
    })
  }
  if (carePlanProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: carePlanProduct.id,
      tier: 'good',
      quantity: 1,
      monthly_price: carePlanProduct.monthly_price,
      onetime_price: carePlanProduct.onetime_price,
    })
  }

  // Better tier - Includes Good + Content
  if (seoProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: seoProduct.id,
      tier: 'better',
      quantity: 1,
      monthly_price: seoProduct.monthly_price,
      onetime_price: seoProduct.onetime_price,
    })
  }
  if (websiteProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: websiteProduct.id,
      tier: 'better',
      quantity: 1,
      monthly_price: websiteProduct.monthly_price,
      onetime_price: websiteProduct.onetime_price,
    })
  }
  if (carePlanProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: carePlanProduct.id,
      tier: 'better',
      quantity: 1,
      monthly_price: carePlanProduct.monthly_price,
      onetime_price: carePlanProduct.onetime_price,
    })
  }
  if (contentProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: contentProduct.id,
      tier: 'better',
      quantity: 2,
      monthly_price: contentProduct.monthly_price,
      onetime_price: contentProduct.onetime_price,
    })
  }

  // Best tier - Full package (includes everything)
  const bestTierProducts = [seoProduct, websiteProduct, contentProduct, socialProduct, aiCreativeProduct, carePlanProduct].filter(Boolean)
  for (const product of bestTierProducts) {
    if (product) {
      recommendationItems.push({
        recommendation_id: DEMO_RECOMMENDATION_ID,
        product_id: product.id,
        tier: 'best',
        quantity: product.category === 'content' ? 4 : 1,
        monthly_price: product.monthly_price,
        onetime_price: product.onetime_price,
      })
    }
  }

  if (recommendationItems.length > 0) {
    await prisma.recommendation_items.createMany({ data: recommendationItems })
    console.log(`Created ${recommendationItems.length} recommendation items (Good: 3, Better: 4, Best: ${bestTierProducts.length})`)
  }

  // Create demo subscription (ACTIVE with products)
  console.log('Creating demo subscription...')
  await prisma.subscriptions.create({
    data: {
      id: DEMO_SUBSCRIPTION_ID,
      client_id: DEMO_CLIENT_ID,
      recommendation_id: DEMO_RECOMMENDATION_ID,
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthly_amount: 2847,
    }
  })

  // Add subscription items - need products that trigger access flags
  const subscriptionItems = []
  for (const product of bestTierProducts) {
    if (product) {
      subscriptionItems.push({
        subscription_id: DEMO_SUBSCRIPTION_ID,
        product_id: product.id,
        quantity: product.category === 'content' ? 4 : 1,
        unit_amount: product.monthly_price,
      })
    }
  }

  if (subscriptionItems.length > 0) {
    await prisma.subscription_items.createMany({ data: subscriptionItems })
    console.log(`Created ${subscriptionItems.length} subscription items`)
  }

  // Create demo checklist items
  console.log('Creating demo checklist items...')
  const checklistTemplates = await prisma.onboarding_checklist_templates.findMany({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' }
  })

  const checklistItems = checklistTemplates.slice(0, 8).map((template, index) => ({
    client_id: DEMO_CLIENT_ID,
    template_id: template.id,
    is_completed: index < 6, // Most are completed
    completed_at: index < 6 ? new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000) : null,
  }))

  if (checklistItems.length > 0) {
    await prisma.client_checklist_items.createMany({ data: checklistItems })
    console.log(`Created ${checklistItems.length} checklist items`)
  }

  // Create demo onboarding responses
  console.log('Creating demo onboarding responses...')
  const questionTemplates = await prisma.onboarding_question_templates.findMany({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' }
  })

  const demoResponses = [
    { question: 'business name', response: 'Raptor Vending' },
    { question: 'website', response: 'https://raptor-vending.com' },
    { question: 'industry', response: 'Vending & Workplace Dining Services' },
    { question: 'target', response: 'Businesses, offices, and facilities in San Antonio looking for modern vending and micromarket solutions' },
    { question: 'goal', response: 'Increase local visibility, generate leads for micromarket installations, and establish authority in workplace dining' },
    { question: 'competitor', response: 'Canteen, Aramark, Five Star Food Service' },
    { question: 'service', response: 'Micromarkets, traditional vending machines, office coffee service, workplace dining solutions' },
    { question: 'location', response: 'San Antonio, TX (serving South Texas)' },
    { question: 'phone', response: '(210) 555-8274' },
    { question: 'email', response: 'info@raptorvending.com' },
    { question: 'brand', response: 'Modern, reliable, convenient, employee-focused' },
    { question: 'color', response: 'Red (#DC2626) and black with white accents' },
  ]

  const onboardingResponses = []
  for (const template of questionTemplates.slice(0, 15)) {
    const matchingDemo = demoResponses.find(d =>
      template.question_text.toLowerCase().includes(d.question)
    )
    if (matchingDemo) {
      onboardingResponses.push({
        client_id: DEMO_CLIENT_ID,
        question_id: template.id,
        response_text: matchingDemo.response,
      })
    }
  }

  if (onboardingResponses.length > 0) {
    await prisma.client_onboarding_responses.createMany({ data: onboardingResponses })
    console.log(`Created ${onboardingResponses.length} onboarding responses`)
  }

  // Create demo communications
  console.log('Creating demo communications...')
  const now = new Date()
  const communications = [
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'email_invite',
      title: 'Welcome to Pyrus Digital Media',
      subject: 'Welcome to Your Client Portal',
      body: 'Hi Mike, Welcome to Pyrus Digital Media! Your client portal is now ready. Log in to track your marketing progress.',
      status: 'opened',
      recipient_email: 'mike@raptorvending.com',
      sent_at: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      opened_at: new Date(now.getTime() - 179 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'result_alert',
      title: 'Keyword Ranking Update',
      subject: '"micromarket san antonio" moved to position #3',
      body: 'Great news! Your target keyword "micromarket san antonio" has improved from position #12 to position #3 on Google.',
      status: 'delivered',
      highlight_type: 'success',
      metadata: { keyword: 'micromarket san antonio', oldPosition: 12, newPosition: 3 },
      sent_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'result_alert',
      title: 'Traffic Milestone Reached',
      subject: 'Your website reached 2,500 monthly visitors!',
      body: 'Congratulations! Your website has reached 2,500 monthly visitors, a 45% increase from last month.',
      status: 'delivered',
      highlight_type: 'success',
      metadata: { milestone: 2500, metric: 'monthly_visitors', growth: '45%' },
      sent_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'content_approval',
      title: 'Blog Post Ready for Review',
      subject: 'New content: "5 Benefits of Micromarkets for Your Workplace"',
      body: 'A new blog post is ready for your review. Please check and approve or request changes.',
      status: 'clicked',
      sent_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      clicked_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 3600000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'monthly_report',
      title: 'December 2024 Performance Report',
      subject: 'Your Monthly Marketing Report is Ready',
      body: 'Your December performance report is now available. Key highlights: +32% traffic, 24 keywords ranking, 8 leads generated.',
      status: 'opened',
      sent_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      opened_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'task_complete',
      title: 'Website Update Completed',
      subject: 'New micromarket gallery section deployed',
      body: 'The new micromarket photo gallery has been added to your website. Showcases your installations at local businesses.',
      status: 'delivered',
      highlight_type: 'success',
      sent_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'result_alert',
      title: 'New Lead Generated',
      subject: 'New contact form submission',
      body: 'You received a new lead from your website contact form. A local office is interested in micromarket installation.',
      status: 'delivered',
      metadata: { leadSource: 'contact_form', interest: 'micromarket installation' },
      sent_at: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
  ]

  await prisma.client_communications.createMany({ data: communications })
  console.log(`Created ${communications.length} communications`)

  // Create demo content items
  // Valid content types: 'blog', 'social', 'email', 'landing_page', 'other'
  // Valid statuses: 'draft', 'pending_review', 'revision_requested', 'approved', 'published', 'rejected'
  console.log('Creating demo content items...')
  const contentItems = [
    {
      client_id: DEMO_CLIENT_ID,
      title: '5 Benefits of Micromarkets for Your Workplace',
      content_type: 'blog',
      body: 'Discover how micromarkets can boost employee satisfaction, increase productivity, and provide healthier options than traditional vending...',
      status: 'published',
      published_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Why San Antonio Businesses Are Switching to Micromarkets',
      content_type: 'blog',
      body: 'Local businesses share their experience upgrading from traditional vending to modern micromarket solutions...',
      status: 'published',
      published_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'The Complete Guide to Office Coffee Service',
      content_type: 'blog',
      body: 'Everything you need to know about providing quality coffee solutions for your workplace...',
      status: 'published',
      published_at: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Monthly Newsletter - January',
      content_type: 'email',
      body: 'This month: New healthy snack options, micromarket spotlight at USAA, and winter promotions...',
      status: 'pending_review',
      due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Social Media Content - Week of Jan 13',
      content_type: 'social',
      body: 'LinkedIn: Micromarket installation showcase\nFacebook: Employee testimonial video\nInstagram: Fresh food delivery photos',
      status: 'approved',
      due_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Free Workplace Assessment Landing Page',
      content_type: 'landing_page',
      body: 'Lead generation page for free workplace vending and micromarket assessment...',
      status: 'published',
      published_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Q1 2025 Marketing Strategy',
      content_type: 'other',
      body: 'Quarterly marketing plan focusing on local SEO, workplace dining content, and Google Ads campaigns...',
      status: 'draft',
      due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
  ]

  await prisma.content.createMany({ data: contentItems })
  console.log(`Created ${contentItems.length} content items`)

  // Create demo activity log
  console.log('Creating demo activity log...')
  const activities = [
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'website_update',
      description: 'Micromarket photo gallery added to website',
      metadata: { page: 'gallery', section: 'micromarkets', changes: ['new_photos', 'installation_showcase'] },
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'seo_ranking',
      description: 'Keyword "micromarket san antonio" improved from #12 to #3',
      metadata: { keyword: 'micromarket san antonio', oldRank: 12, newRank: 3 },
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'content_published',
      description: 'Blog post "5 Benefits of Micromarkets for Your Workplace" published',
      metadata: { contentType: 'blog', wordCount: 1200, readTime: '5 min' },
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'lead_generated',
      description: 'New lead from website - local office interested in micromarket',
      metadata: { source: 'contact_form', interest: 'micromarket installation', leadScore: 85 },
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'traffic_milestone',
      description: 'Website reached 2,500 monthly visitors',
      metadata: { milestone: 2500, metric: 'monthly_visitors', previousMonth: 1724 },
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'social_engagement',
      description: 'LinkedIn post about workplace dining reached 1,800 impressions',
      metadata: { platform: 'linkedin', impressions: 1800, engagementRate: '4.1%', likes: 45, comments: 12 },
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'seo_ranking',
      description: 'Keyword "vending machines san antonio" entered top 10 at position #7',
      metadata: { keyword: 'vending machines san antonio', oldRank: 19, newRank: 7 },
      created_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'website_update',
      description: 'New services page added with micromarket and coffee service details',
      metadata: { page: 'services', action: 'created', sections: ['micromarkets', 'vending', 'coffee'] },
      created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'ad_campaign',
      description: 'Google Ads campaign "Micromarket San Antonio" achieved 5.1% CTR',
      metadata: { platform: 'google_ads', campaign: 'Micromarket San Antonio', ctr: '5.1%', conversions: 8, spend: 380 },
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'lead_generated',
      description: 'New lead from Google Ads - corporate campus interested in vending',
      metadata: { source: 'google_ads', interest: 'corporate vending', leadScore: 92, company: 'Valero Energy' },
      created_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
    },
  ]

  await prisma.activity_log.createMany({ data: activities })
  console.log(`Created ${activities.length} activity log entries`)

  console.log('\n✅ Demo client seeded successfully!')
  console.log(`\nDemo Client ID: ${DEMO_CLIENT_ID}`)
  console.log(`Demo Recommendation ID: ${DEMO_RECOMMENDATION_ID}`)
  console.log('\nThe demo client has:')
  console.log('  - Status: active (purchased Best tier)')
  console.log('  - Results page: enabled (agency_dashboard_share_key set)')
  console.log('  - Activity page: enabled (basecamp_id set)')
  console.log('  - Website page: enabled (landingsite_preview_url set)')
  console.log('  - Content page: enabled (has content products)')
  console.log('  - Sample data on all pages')
  console.log('\nView the demo at: /getting-started?viewingAs=' + DEMO_CLIENT_ID)
}

seedDemoClient()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
