import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedContent() {
  // Get demo client (Raptor Vending)
  const clients = await pool.query("SELECT id, name FROM clients WHERE name ILIKE '%raptor%' OR name ILIKE '%demo%' LIMIT 1");
  const demoClient = clients.rows[0];

  if (!demoClient) {
    console.log('No demo client found');
    await pool.end();
    return;
  }

  console.log('Demo client:', demoClient.name, demoClient.id);

  // Check if content already exists
  const existing = await pool.query('SELECT COUNT(*) FROM content WHERE client_id = $1', [demoClient.id]);
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('Content already exists for demo client:', existing.rows[0].count, 'items');
    await pool.end();
    return;
  }

  // Seed content
  const contentItems = [
    {
      title: 'Why San Antonio Businesses Are Switching to Micromarkets',
      content_type: 'Blog Post',
      platform: 'website',
      excerpt: 'Discover why forward-thinking San Antonio companies are embracing the micromarket revolution...',
      body: 'Discover why forward-thinking San Antonio companies are embracing the micromarket revolution. From 24/7 access to healthier options, learn how micromarkets are transforming workplace dining.',
      status: 'pending_review',
      urgent: true,
      deadline: new Date(Date.now() + 23 * 60 * 60 * 1000),
      target_keyword: 'micromarket San Antonio',
      secondary_keywords: 'workplace vending, office snacks',
      word_count: 1200,
      seo_optimized: true
    },
    {
      title: 'New Year Special: Free Coffee Service Setup',
      content_type: 'GBP Post',
      platform: 'gbp',
      excerpt: 'Start 2026 right with our complimentary coffee service installation...',
      body: 'Start 2026 right with our complimentary coffee service installation for new customers. Premium coffee machines, fresh beans, and full maintenance included.',
      status: 'pending_review',
      urgent: false,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Micromarket Promo Banner',
      content_type: '4 Graphics Package',
      platform: 'ai-creative',
      excerpt: 'Eye-catching promotional graphics showcasing our new micromarket installations...',
      body: 'Professional AI-generated graphics for social media and website featuring our latest micromarket installations.',
      status: 'pending_review',
      urgent: false,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Employee Wellness: Healthy Snacking at Work',
      content_type: 'Blog Post',
      platform: 'website',
      excerpt: 'Learn how providing healthy snack options can boost productivity and morale...',
      body: 'Studies show that employees with access to healthy snacks are more productive. Discover how our healthy vending options can transform your workplace.',
      status: 'approved',
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      target_keyword: 'healthy workplace snacks',
      word_count: 950,
      seo_optimized: true
    },
    {
      title: 'Holiday Hours Update',
      content_type: 'GBP Post',
      platform: 'gbp',
      excerpt: 'Important update about our holiday schedule...',
      body: 'Wishing everyone a happy holiday season! Our service team will be available for emergencies throughout the holidays.',
      status: 'published',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      published_url: 'https://business.google.com/posts/raptor-vending'
    },
    {
      title: 'Success Story: Tech Company Goes Vending-Free',
      content_type: 'Blog Post',
      platform: 'website',
      excerpt: 'How a local tech company replaced traditional vending with a full-service micromarket...',
      body: 'Case study showcasing the transformation of XYZ Tech workplace with our micromarket solution. 40% increase in employee satisfaction.',
      status: 'published',
      published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      published_url: 'https://raptorvending.com/blog/tech-company-micromarket',
      target_keyword: 'micromarket case study',
      word_count: 1400,
      seo_optimized: true
    }
  ];

  for (const item of contentItems) {
    await pool.query(
      `INSERT INTO content (
        client_id, title, content_type, platform, excerpt, body, status, urgent,
        deadline, target_keyword, secondary_keywords, word_count, seo_optimized,
        scheduled_date, published_at, published_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        demoClient.id,
        item.title,
        item.content_type,
        item.platform,
        item.excerpt,
        item.body,
        item.status,
        item.urgent || false,
        item.deadline || null,
        item.target_keyword || null,
        item.secondary_keywords || null,
        item.word_count || null,
        item.seo_optimized || false,
        item.scheduled_date || null,
        item.published_at || null,
        item.published_url || null
      ]
    );
    console.log('Inserted:', item.title);
  }

  console.log('Demo content seeded successfully!');
  await pool.end();
}

seedContent();
