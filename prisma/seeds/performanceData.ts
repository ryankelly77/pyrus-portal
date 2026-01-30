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

// Helper to generate random number in range
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

// Helper to get date N days ago
const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Performance profiles for variety
type PerfProfile = 'critical' | 'at_risk' | 'needs_attention' | 'healthy' | 'thriving'

const performanceProfiles: Record<PerfProfile, { scoreRange: [number, number]; trending: 'up' | 'down' | 'stable' }> = {
  critical: { scoreRange: [5, 19], trending: 'down' },
  at_risk: { scoreRange: [20, 39], trending: 'down' },
  needs_attention: { scoreRange: [40, 59], trending: 'stable' },
  healthy: { scoreRange: [60, 79], trending: 'up' },
  thriving: { scoreRange: [80, 95], trending: 'up' },
}

// Growth stages based on tenure
const getGrowthStage = (monthsActive: number): string => {
  if (monthsActive < 3) return 'seedling'
  if (monthsActive < 6) return 'sprouting'
  if (monthsActive < 12) return 'blooming'
  return 'harvesting'
}

// Client types for different data generation
type ClientType = 'seo' | 'paid_media' | 'ai_visibility' | 'mixed'

async function main() {
  console.log('🌱 Seeding performance data...\n')

  // Fetch existing clients
  const clients = await prisma.clients.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, created_at: true },
  })

  if (clients.length === 0) {
    console.log('❌ No active clients found. Run the main seed first.')
    return
  }

  console.log(`Found ${clients.length} active clients\n`)

  // Assign performance profiles and client types with explicit distribution
  // Ensure we have good representation of each status
  const profileDistribution: PerfProfile[] = [
    'critical',      // 0 - First client is critical
    'critical',      // 1 - Second is also critical
    'critical',      // 2 - Third is critical too
    'at_risk',       // 3
    'at_risk',       // 4
    'needs_attention', // 5
    'needs_attention', // 6
    'healthy',       // 7
    'healthy',       // 8
    'thriving',      // 9
  ]

  const typeDistribution: ClientType[] = ['seo', 'paid_media', 'ai_visibility', 'mixed', 'seo', 'paid_media', 'ai_visibility', 'mixed', 'seo', 'paid_media']

  // Assign varied tenure months for different growth stages
  const tenureDistribution = [1, 2, 4, 5, 7, 9, 11, 14, 18, 24]

  const clientConfigs: {
    client: typeof clients[0]
    profile: PerfProfile
    type: ClientType
    monthsActive: number
  }[] = clients.map((client, idx) => {
    return {
      client,
      profile: profileDistribution[idx % profileDistribution.length],
      type: typeDistribution[idx % typeDistribution.length],
      monthsActive: tenureDistribution[idx % tenureDistribution.length],
    }
  })

  // Clear existing performance data
  console.log('Clearing existing performance data...')
  await prisma.client_alerts.deleteMany()
  await prisma.ai_visibility_scores.deleteMany()
  await prisma.leads.deleteMany()
  await prisma.keyword_rankings.deleteMany()
  await prisma.metric_snapshots.deleteMany()
  console.log('✓ Cleared existing data\n')

  // Metric types we track
  const metricTypes = ['visitors', 'keyword_avg_position', 'leads', 'ai_visibility', 'conversions']

  // Process each client
  for (const config of clientConfigs) {
    const { client, profile, type, monthsActive } = config
    const { scoreRange, trending } = performanceProfiles[profile]
    const growthStage = getGrowthStage(monthsActive)

    console.log(`\n📊 ${client.name}`)
    console.log(`   Profile: ${profile} | Type: ${type} | Stage: ${growthStage} | Tenure: ${monthsActive}mo`)

    // Update client growth stage
    await prisma.clients.update({
      where: { id: client.id },
      data: {
        growth_stage: growthStage,
        stage_updated_at: new Date(),
      },
    })

    // Generate metric snapshots for each metric type
    // Add variation: each metric gets its own direction with some randomness
    const getMetricDirection = (baseTrending: 'up' | 'down' | 'stable'): number => {
      // 70% chance to follow the overall trend, 30% chance to go different
      const followTrend = rand(1, 10) <= 7
      if (followTrend) {
        return baseTrending === 'up' ? 1 : baseTrending === 'down' ? -1 : 0
      }
      // Random direction
      const r = rand(1, 3)
      return r === 1 ? 1 : r === 2 ? -1 : 0
    }

    for (const metricType of metricTypes) {
      let currentValue: number
      let previousValue: number
      const deltaMultiplier = getMetricDirection(trending)

      switch (metricType) {
        case 'visitors':
          currentValue = rand(500, 5000)
          previousValue = currentValue + (rand(100, 500) * deltaMultiplier * -1)
          break
        case 'keyword_avg_position':
          currentValue = rand(5, 30) // Lower is better for positions
          previousValue = currentValue + (rand(2, 8) * deltaMultiplier) // Opposite for position
          break
        case 'leads':
          currentValue = rand(5, 50)
          previousValue = currentValue + (rand(2, 10) * deltaMultiplier * -1)
          break
        case 'ai_visibility':
          currentValue = rand(30, 90)
          previousValue = currentValue + (rand(5, 15) * deltaMultiplier * -1)
          break
        case 'conversions':
          currentValue = rand(1, 20)
          previousValue = currentValue + (rand(1, 5) * deltaMultiplier * -1)
          break
        default:
          currentValue = rand(10, 100)
          previousValue = currentValue + (rand(5, 20) * deltaMultiplier * -1)
      }

      // Current period (last 30 days)
      await prisma.metric_snapshots.create({
        data: {
          client_id: client.id,
          metric_type: metricType,
          value: Math.max(0, currentValue),
          period_start: daysAgo(30),
          period_end: new Date(),
        },
      })

      // Previous period (30-60 days ago)
      await prisma.metric_snapshots.create({
        data: {
          client_id: client.id,
          metric_type: metricType,
          value: Math.max(0, previousValue),
          period_start: daysAgo(60),
          period_end: daysAgo(30),
        },
      })
    }
    console.log('   ✓ Metric snapshots created')

    // SEO clients get keyword rankings
    if (type === 'seo' || type === 'mixed') {
      const keywords = [
        'best ' + client.name.toLowerCase().split(' ')[0] + ' services',
        client.name.toLowerCase().split(' ')[0] + ' near me',
        'top ' + client.name.toLowerCase().split(' ')[0] + ' company',
        'affordable ' + client.name.toLowerCase().split(' ')[0],
        client.name.toLowerCase() + ' reviews',
        'local ' + client.name.toLowerCase().split(' ')[0],
      ]

      const searchEngines = ['google', 'bing', 'chatgpt', 'perplexity']

      for (const keyword of keywords.slice(0, rand(4, 6))) {
        const position = rand(1, 50)

        // Google ranking (always)
        await prisma.keyword_rankings.create({
          data: {
            client_id: client.id,
            keyword,
            search_engine: 'google',
            position,
            recorded_at: new Date(),
          },
        })

        // Sometimes add AI search engines
        if (rand(0, 1) === 1) {
          const aiEngine = searchEngines[rand(2, 3)]
          await prisma.keyword_rankings.create({
            data: {
              client_id: client.id,
              keyword,
              search_engine: aiEngine,
              position: rand(1, 10),
              recorded_at: new Date(),
            },
          })
        }
      }
      console.log('   ✓ Keyword rankings created')
    }

    // Paid media clients get leads
    if (type === 'paid_media' || type === 'mixed') {
      const leadSources = ['organic', 'paid', 'referral', 'social', 'direct']
      const numLeads = rand(10, 30)

      for (let i = 0; i < numLeads; i++) {
        const leadDaysAgo = rand(0, 60)
        await prisma.leads.create({
          data: {
            client_id: client.id,
            source: leadSources[rand(0, leadSources.length - 1)],
            lead_score: rand(20, 100),
            converted: rand(0, 3) === 0, // 25% conversion rate
            metadata: {
              name: `Lead ${i + 1}`,
              created: daysAgo(leadDaysAgo).toISOString(),
            },
            created_at: daysAgo(leadDaysAgo),
          },
        })
      }
      console.log(`   ✓ ${numLeads} leads created`)
    }

    // AI visibility clients get scores
    if (type === 'ai_visibility' || type === 'mixed') {
      const platforms = ['chatgpt', 'perplexity', 'claude', 'gemini']
      const queries = [
        'best ' + client.name.split(' ')[0].toLowerCase(),
        client.name.split(' ')[0].toLowerCase() + ' recommendations',
        'top rated ' + client.name.split(' ')[0].toLowerCase(),
      ]

      for (const platform of platforms.slice(0, rand(2, 4))) {
        for (const query of queries.slice(0, rand(1, 2))) {
          const visibility = trending === 'up' ? rand(60, 95) : trending === 'down' ? rand(10, 40) : rand(30, 70)
          await prisma.ai_visibility_scores.create({
            data: {
              client_id: client.id,
              platform,
              query,
              visibility_score: visibility,
              mentioned: visibility > 50,
              position: visibility > 50 ? rand(1, 5) : null,
              recorded_at: daysAgo(rand(0, 7)),
            },
          })
        }
      }
      console.log('   ✓ AI visibility scores created')
    }
  }

  // Create some alerts across clients
  console.log('\n📢 Creating alerts...')
  const alertClients = clientConfigs.filter(c => c.profile === 'critical' || c.profile === 'at_risk').slice(0, 3)

  for (const config of alertClients) {
    // Published alert
    await prisma.client_alerts.create({
      data: {
        client_id: config.client.id,
        alert_type: 'intervention',
        message: `Your ${config.profile === 'critical' ? 'performance metrics require immediate attention' : 'some metrics are trending below target'}. Let's schedule a call to discuss optimization strategies.`,
        status: 'published',
        published_at: daysAgo(rand(1, 14)),
      },
    })
  }

  // Add a milestone alert for a thriving client
  const thrivingClient = clientConfigs.find(c => c.profile === 'thriving')
  if (thrivingClient) {
    await prisma.client_alerts.create({
      data: {
        client_id: thrivingClient.client.id,
        alert_type: 'milestone',
        message: '🎉 Congratulations! Your website traffic has increased by 50% this quarter. Your SEO strategy is paying off!',
        status: 'published',
        published_at: daysAgo(3),
      },
    })
  }

  // Add a draft alert
  const needsAttentionClient = clientConfigs.find(c => c.profile === 'needs_attention')
  if (needsAttentionClient) {
    await prisma.client_alerts.create({
      data: {
        client_id: needsAttentionClient.client.id,
        alert_type: 'performance_focus',
        message: 'Your Q1 performance shows steady progress. Here are some opportunities to accelerate growth...',
        status: 'draft',
      },
    })
  }

  console.log('✓ Alerts created')

  console.log('\n✅ Performance data seeding complete!')
  console.log('\nSummary:')
  console.log(`  - ${clientConfigs.filter(c => c.profile === 'critical').length} Critical clients`)
  console.log(`  - ${clientConfigs.filter(c => c.profile === 'at_risk').length} At Risk clients`)
  console.log(`  - ${clientConfigs.filter(c => c.profile === 'needs_attention').length} Needs Attention clients`)
  console.log(`  - ${clientConfigs.filter(c => c.profile === 'healthy').length} Healthy clients`)
  console.log(`  - ${clientConfigs.filter(c => c.profile === 'thriving').length} Thriving clients`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
