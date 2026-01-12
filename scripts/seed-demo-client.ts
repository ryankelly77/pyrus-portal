/**
 * Seed Demo Client
 *
 * Creates a demo client with all necessary data for showcasing the portal.
 * The demo client has a fixed UUID so it can be easily referenced.
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

  // Create demo client
  console.log('Creating demo client...')
  await prisma.clients.create({
    data: {
      id: DEMO_CLIENT_ID,
      name: 'Acme Corporation',
      contact_name: 'John Smith',
      contact_email: 'john@acme-demo.com',
      avatar_color: '#3B82F6',
      growth_stage: 'growing',
      status: 'active',
      monthly_spend: 2500,
      start_date: new Date('2024-06-15'),
      notes: 'This is a demo client used for showcasing the portal. Changes to the recommendation will appear here.',
    }
  })

  // Get products for the recommendation and subscription
  const products = await prisma.products.findMany({ where: { status: 'active' } })
  const bundles = await prisma.bundles.findMany({ where: { status: 'active' } })

  // Find specific products by category
  const seoProduct = products.find(p => p.category === 'seo')
  const websiteProduct = products.find(p => p.category === 'website')
  const contentProducts = products.filter(p => p.category === 'content').slice(0, 2)
  const socialProduct = products.find(p => p.category === 'social')
  const adsProduct = products.find(p => p.category === 'ads')

  // Create demo recommendation (editable in recommendation builder)
  console.log('Creating demo recommendation...')
  await prisma.recommendations.create({
    data: {
      id: DEMO_RECOMMENDATION_ID,
      client_id: DEMO_CLIENT_ID,
      status: 'draft', // Draft so it can be edited
      total_monthly: 2500,
      total_onetime: 1500,
      notes: 'Demo recommendation - edit this in the Recommendation Builder to see changes in the demo portal view.',
    }
  })

  // Add recommendation items for Good/Better/Best tiers
  const recommendationItems = []

  // Good tier - basic package
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

  // Better tier - includes Good + more
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
  if (contentProducts[0]) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: contentProducts[0].id,
      tier: 'better',
      quantity: 2,
      monthly_price: contentProducts[0].monthly_price,
      onetime_price: contentProducts[0].onetime_price,
    })
  }

  // Best tier - full package
  if (seoProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: seoProduct.id,
      tier: 'best',
      quantity: 1,
      monthly_price: seoProduct.monthly_price,
      onetime_price: seoProduct.onetime_price,
    })
  }
  if (websiteProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: websiteProduct.id,
      tier: 'best',
      quantity: 1,
      monthly_price: websiteProduct.monthly_price,
      onetime_price: websiteProduct.onetime_price,
    })
  }
  if (contentProducts[0]) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: contentProducts[0].id,
      tier: 'best',
      quantity: 4,
      monthly_price: contentProducts[0].monthly_price,
      onetime_price: contentProducts[0].onetime_price,
    })
  }
  if (socialProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: socialProduct.id,
      tier: 'best',
      quantity: 1,
      monthly_price: socialProduct.monthly_price,
      onetime_price: socialProduct.onetime_price,
    })
  }
  if (adsProduct) {
    recommendationItems.push({
      recommendation_id: DEMO_RECOMMENDATION_ID,
      product_id: adsProduct.id,
      tier: 'best',
      quantity: 1,
      monthly_price: adsProduct.monthly_price,
      onetime_price: adsProduct.onetime_price,
    })
  }

  if (recommendationItems.length > 0) {
    await prisma.recommendation_items.createMany({ data: recommendationItems })
    console.log(`Created ${recommendationItems.length} recommendation items`)
  }

  // Create demo subscription (what the "active" client has)
  console.log('Creating demo subscription...')
  const subscriptionProducts = [seoProduct, websiteProduct, contentProducts[0]].filter(Boolean)

  await prisma.subscriptions.create({
    data: {
      id: DEMO_SUBSCRIPTION_ID,
      client_id: DEMO_CLIENT_ID,
      recommendation_id: DEMO_RECOMMENDATION_ID,
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthly_amount: 2500,
    }
  })

  // Add subscription items
  const subscriptionItems = subscriptionProducts.map(product => ({
    subscription_id: DEMO_SUBSCRIPTION_ID,
    product_id: product!.id,
    quantity: product!.category === 'content' ? 2 : 1,
    unit_amount: product!.monthly_price,
  }))

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
    is_completed: index < 4, // First 4 are completed
    completed_at: index < 4 ? new Date(Date.now() - (4 - index) * 24 * 60 * 60 * 1000) : null,
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
    { question: 'business name', response: 'Acme Corporation' },
    { question: 'website', response: 'https://www.acme-demo.com' },
    { question: 'industry', response: 'Technology Services' },
    { question: 'target', response: 'Small to medium businesses in the tech sector' },
    { question: 'goal', response: 'Increase online visibility and generate more qualified leads' },
    { question: 'competitor', response: 'TechCorp, InnovateTech, DigitalFirst' },
    { question: 'service', response: 'Software development, IT consulting, Cloud solutions' },
    { question: 'location', response: 'San Francisco, CA' },
    { question: 'phone', response: '(555) 123-4567' },
    { question: 'email', response: 'contact@acme-demo.com' },
  ]

  const onboardingResponses = []
  for (const template of questionTemplates.slice(0, 10)) {
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
      body: 'Hi John, Welcome to Pyrus Digital Media! Your client portal is now ready...',
      status: 'opened',
      recipient_email: 'john@acme-demo.com',
      sent_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      opened_at: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'result_alert',
      title: 'Keyword Ranking Update',
      subject: 'Great news! "cloud services" moved to position #3',
      body: 'Your keyword "cloud services" has improved from position #12 to position #3.',
      status: 'delivered',
      highlight_type: 'success',
      metadata: { keyword: 'cloud services', oldPosition: 12, newPosition: 3 },
      sent_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'content_approval',
      title: 'Blog Post Ready for Review',
      subject: 'New content ready: "10 Ways to Improve Your IT Infrastructure"',
      body: 'A new blog post is ready for your review and approval.',
      status: 'clicked',
      sent_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      clicked_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 3600000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'monthly_report',
      title: 'December 2024 Performance Report',
      subject: 'Your Monthly Marketing Report is Ready',
      body: 'Your December performance report is now available in your portal.',
      status: 'opened',
      sent_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      opened_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      comm_type: 'task_complete',
      title: 'Website Update Completed',
      subject: 'Task Complete: Homepage redesign deployed',
      body: 'The homepage redesign has been deployed to your live website.',
      status: 'delivered',
      highlight_type: 'success',
      sent_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
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
      title: '10 Ways to Improve Your IT Infrastructure',
      content_type: 'blog',
      body: 'A comprehensive guide to modernizing your IT systems...',
      status: 'published',
      published_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Cloud Migration Success Story',
      content_type: 'blog',
      body: 'How Acme helped a client reduce costs by 40% with cloud migration...',
      status: 'published',
      published_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Monthly Newsletter - January',
      content_type: 'email',
      body: 'Monthly newsletter with company updates and tips...',
      status: 'pending_review',
      due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      title: 'Social Media Content Calendar - January',
      content_type: 'social',
      body: 'Monthly social media posting schedule...',
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
      description: 'Homepage hero section updated with new messaging',
      metadata: { page: 'homepage', section: 'hero' },
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'seo_ranking',
      description: 'Keyword "cloud services" improved from #12 to #3',
      metadata: { keyword: 'cloud services', oldRank: 12, newRank: 3 },
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'content_published',
      description: 'Blog post "10 Ways to Improve Your IT Infrastructure" published',
      metadata: { contentType: 'blog' },
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'traffic_milestone',
      description: 'Website reached 10,000 monthly visitors',
      metadata: { milestone: 10000, metric: 'monthly_visitors' },
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      client_id: DEMO_CLIENT_ID,
      activity_type: 'social_engagement',
      description: 'LinkedIn post reached 5,000 impressions',
      metadata: { platform: 'linkedin', impressions: 5000 },
      created_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    },
  ]

  await prisma.activity_log.createMany({ data: activities })
  console.log(`Created ${activities.length} activity log entries`)

  console.log('\n✅ Demo client seeded successfully!')
  console.log(`\nDemo Client ID: ${DEMO_CLIENT_ID}`)
  console.log(`Demo Recommendation ID: ${DEMO_RECOMMENDATION_ID}`)
  console.log('\nYou can now:')
  console.log('1. View the demo portal at /getting-started?viewingAs=' + DEMO_CLIENT_ID)
  console.log('2. Edit the demo recommendation in the Recommendation Builder')
  console.log('3. Add "View Demo" button to the clients overview page')
}

seedDemoClient()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
