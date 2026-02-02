import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.products.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        short_description: true,
        long_description: true,
        monthly_price: true,
        onetime_price: true,
        stripe_product_id: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      category: product.category,
      short_description: product.short_description,
      description: product.long_description,
      monthly_price: product.monthly_price ? Number(product.monthly_price) : null,
      onetime_price: product.onetime_price ? Number(product.onetime_price) : null,
      stripe_product_id: product.stripe_product_id,
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}
