const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTable() {
  try {
    // Create subscription_history table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('subscription_history table created successfully');

    // Create index for faster lookups
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id
      ON subscription_history(subscription_id)
    `);

    console.log('Index created successfully');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTable();
