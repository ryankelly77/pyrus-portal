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

async function main() {
  // Find Raptor Vending client
  const raptorClient = await prisma.clients.findFirst({
    where: { name: { contains: 'Raptor Vending', mode: 'insensitive' } },
  })

  if (!raptorClient) {
    console.log('Raptor Vending client not found')
    return
  }

  console.log('Found client:', raptorClient.name, raptorClient.id)

  // Delete existing reports for clean re-seed
  await prisma.report_sections.deleteMany({
    where: { report: { client_id: raptorClient.id } },
  })
  await prisma.campaign_reports.deleteMany({
    where: { client_id: raptorClient.id },
  })
  console.log('Cleared existing reports')

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
      manager_note: 'Strong start for Raptor Vending. Local SEO foundation is fully in place, GBP is optimized, and keyword growth is accelerating.',
    },
  })
  console.log('Created report:', report.id)

  // Create sections
  const sections = [
    { section_type: 'search_visibility', sort_order: 0, data: { currentImpressions: 4200, previousImpressions: 1100, currentClicks: 180, previousClicks: 48, currentCTR: 4.3, previousCTR: 4.4, currentAvgPosition: 28.4, previousAvgPosition: 44.2, monthlyHistory: [{ month: 'Aug 24', impressions: 320, clicks: 14, isPreCampaign: true }, { month: 'Sep 24', impressions: 580, clicks: 26, isPreCampaign: true }, { month: 'Oct 24', impressions: 900, clicks: 38, isPreCampaign: true }, { month: 'Nov 24', impressions: 1400, clicks: 60, isCampaignStart: true }, { month: 'Dec 24', impressions: 2600, clicks: 110 }, { month: 'Jan 25', impressions: 4200, clicks: 180 }] } },
    { section_type: 'organic_traffic', sort_order: 1, data: { currentUsers: 340, previousUsers: 112, currentSessions: 420, previousSessions: 138, monthlyHistory: [{ month: 'Aug 24', users: 42, isPreCampaign: true }, { month: 'Sep 24', users: 68, isPreCampaign: true }, { month: 'Oct 24', users: 95, isPreCampaign: true }, { month: 'Nov 24', users: 140, isCampaignStart: true }, { month: 'Dec 24', users: 230 }, { month: 'Jan 25', users: 340 }] } },
    { section_type: 'keyword_rankings', sort_order: 2, data: { totalTracked: 45, top3: 0, top3Delta: 0, top10: 2, top10Delta: 2, top20: 8, top20Delta: 8, top30: 14, top30Delta: 14, top100: 28, top100Delta: 28, totalImproved: 28, notRanking: 17 } },
    { section_type: 'keyword_growth', sort_order: 3, data: { months: [{ label: 'Aug 24', top3: 0, pos4to20: 0, pos21to50: 2, pos51to100: 4, serpFeatures: 0, isPreCampaign: true }, { label: 'Sep 24', top3: 0, pos4to20: 0, pos21to50: 3, pos51to100: 8, serpFeatures: 0, isPreCampaign: true }, { label: 'Oct 24', top3: 0, pos4to20: 1, pos21to50: 5, pos51to100: 12, serpFeatures: 0, isPreCampaign: true }, { label: 'Nov 24', top3: 0, pos4to20: 2, pos21to50: 8, pos51to100: 18, serpFeatures: 40, isCampaignStart: true }, { label: 'Dec 24', top3: 0, pos4to20: 5, pos21to50: 12, pos51to100: 22, serpFeatures: 80 }, { label: 'Jan 25', top3: 0, pos4to20: 8, pos21to50: 14, pos51to100: 28, serpFeatures: 120 }] } },
    { section_type: 'link_building', sort_order: 4, data: { campaignTotal: 90, months: [{ month: 'Nov 2024', contextual: 10, guestPosts: 5, web2: 15, other: 0 }, { month: 'Dec 2024', contextual: 12, guestPosts: 5, web2: 15, other: 0 }, { month: 'Jan 2025', contextual: 14, guestPosts: 6, web2: 8, other: 0 }], totalContextual: 36, totalGuestPosts: 16, totalWeb2: 38, totalOther: 0 } },
    { section_type: 'local_seo', sort_order: 5, data: { monthlyPosts: [{ month: 'Nov', count: 12 }, { month: 'Dec', count: 14 }, { month: 'Jan', count: 16 }], notes: 'GBP fully optimized: 40+ photos, all services listed, 3 Q&As added, citations submitted to 52 directories.' } },
    { section_type: 'review_management', sort_order: 6, data: { platforms: [{ platform: 'Google', currentRating: 4.9, previousRating: 4.9, currentTotal: 8, previousTotal: 6, newThisPeriod: 2 }], monthlyReviews: [{ month: 'Nov', google: 1 }, { month: 'Dec', google: 0 }, { month: 'Jan', google: 1 }] } },
    { section_type: 'technical_audit', sort_order: 7, data: { issues: [{ title: 'Site Speed (Mobile)', description: 'Core Web Vitals optimized — LCP improved from 4.2s to 2.1s.', status: 'resolved' }, { title: 'Schema Markup', description: 'LocalBusiness and Product schema added to all service pages.', status: 'resolved' }, { title: 'Missing Alt Tags', description: 'Alt tags added to all product and location images.', status: 'resolved' }, { title: 'Internal Linking', description: 'Silo structure being built out for vending machine categories.', status: 'in_progress' }] } },
    { section_type: 'ai_visibility', sort_order: 8, data: { platforms: [{ platform: 'ChatGPT', mentioned: false, visibilityScore: 18, sentiment: 'neutral' }, { platform: 'Google Gemini', mentioned: false, visibilityScore: 22, sentiment: 'neutral' }, { platform: 'Perplexity', mentioned: false, visibilityScore: 12, sentiment: 'neutral' }], queriesTracked: 8, queriesMentioned: 0, notes: 'AI visibility is expected to be low in months 1–3.' } },
    { section_type: 'coming_next', sort_order: 9, data: { items: [{ title: 'Office Vending Content Silo', description: 'Building 6 pages targeting "office vending San Antonio"', iconColor: 'teal' }, { title: 'Citation Cleanup', description: 'NAP consistency audit + submit to 20 additional directories.', iconColor: 'blue' }, { title: 'Link Velocity Increase', description: 'Scaling from 30 to 50 links/month.', iconColor: 'green' }, { title: 'Review Generation', description: 'QR code + email sequence for Google reviews.', iconColor: 'orange' }] } },
  ]

  for (const section of sections) {
    await prisma.report_sections.create({
      data: { report_id: report.id, section_type: section.section_type, sort_order: section.sort_order, data: section.data },
    })
  }
  console.log('✓ Created 10 report sections')
}

main().catch(console.error).finally(() => prisma.$disconnect())
