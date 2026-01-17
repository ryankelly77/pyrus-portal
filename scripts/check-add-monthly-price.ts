import { prisma, dbPool } from '../src/lib/prisma'

async function main() {
  // Check if the column exists by querying the information schema
  const result = await dbPool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'client_products' AND column_name = 'monthly_price'
  `)

  if (result.rows.length === 0) {
    console.log('monthly_price column does not exist, adding it...')
    await dbPool.query(`ALTER TABLE client_products ADD COLUMN monthly_price DECIMAL`)
    console.log('Column added successfully')
  } else {
    console.log('monthly_price column already exists')
  }

  // List some data from the table
  const products = await prisma.client_products.findMany({
    include: { product: { select: { name: true, monthly_price: true } } },
    take: 5
  })
  console.log('Sample client products:', JSON.stringify(products, null, 2))
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect()
    dbPool.end()
  })
