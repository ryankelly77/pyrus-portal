const { prisma } = require('../src/lib/prisma');

async function check() {
  const products = await prisma.products.findMany({
    where: { status: 'active' },
    select: { id: true, name: true }
  });

  const questions = await prisma.onboarding_question_templates.findMany({
    include: { product: { select: { name: true } } },
    orderBy: [{ product_id: 'asc' }, { sort_order: 'asc' }]
  });

  console.log('=== Question Templates by Product ===');
  const byProduct = {};
  questions.forEach(q => {
    const name = q.product?.name || 'Unknown';
    if (!byProduct[name]) byProduct[name] = [];
    byProduct[name].push(q.question_text);
  });

  Object.keys(byProduct).forEach(name => {
    console.log('\n' + name + ':');
    byProduct[name].forEach((q, i) => console.log('  ' + (i+1) + '. ' + q));
  });

  const contentProducts = ['Content Writing', 'AI Creative Assets', 'Business Branding Foundation'];
  console.log('\n=== Content Products Question Status ===');
  for (const cp of contentProducts) {
    const product = products.find(p => p.name === cp);
    const hasQuestions = product ? questions.some(q => q.product_id === product.id) : false;
    console.log(cp + ': ' + (hasQuestions ? 'Has questions' : 'NO QUESTIONS'));
  }

  await prisma.$disconnect();
}
check();
