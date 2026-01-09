import { prisma } from './src/lib/prisma';

async function checkSubscriptions() {
  // First find Ruger client
  const ruger = await prisma.clients.findFirst({
    where: {
      name: { contains: 'Ruger', mode: 'insensitive' }
    }
  });
  
  console.log('Ruger client:', ruger?.id, ruger?.name);
  
  if (!ruger) {
    console.log('Ruger not found');
    return;
  }
  
  // Check subscriptions for Ruger
  const subscriptions = await prisma.subscriptions.findMany({
    where: { client_id: ruger.id },
    include: {
      subscription_items: {
        include: {
          product: true,
          bundle: true,
        }
      }
    }
  });
  
  console.log('\nSubscriptions count:', subscriptions.length);
  console.log('Subscriptions:', JSON.stringify(subscriptions, null, 2));
  
  // Also check what recommendation items exist for best tier
  const recommendation = await prisma.recommendations.findFirst({
    where: { client_id: ruger.id },
    include: {
      recommendation_items: {
        include: {
          product: true,
          bundle: true,
          addon: true,
        }
      }
    }
  });
  
  console.log('\nRecommendation purchased_tier:', recommendation?.purchased_tier);
  console.log('Best tier items:', recommendation?.recommendation_items.filter(i => i.tier === 'best').map(i => ({
    name: i.product?.name || i.bundle?.name || i.addon?.name,
    monthly: i.monthly_price
  })));
}

checkSubscriptions().catch(console.error);
