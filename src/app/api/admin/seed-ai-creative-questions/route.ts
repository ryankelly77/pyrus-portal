import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

// POST /api/admin/seed-ai-creative-questions - Add onboarding questions for AI Creative Assets
export async function POST() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    // Find AI Creative Assets product
    const product = await prisma.products.findFirst({
      where: { name: 'AI Creative Assets' }
    })

    if (!product) {
      return NextResponse.json({ error: 'AI Creative Assets product not found' }, { status: 404 })
    }

    // Check if questions already exist
    const existing = await prisma.onboarding_question_templates.findMany({
      where: { product_id: product.id }
    })

    if (existing.length > 0) {
      return NextResponse.json({
        message: 'Questions already exist for this product',
        count: existing.length
      })
    }

    // Add onboarding questions for AI Creative Assets
    const questions = [
      {
        product_id: product.id,
        question_text: 'What are your primary brand colors?',
        question_type: 'textarea',
        placeholder: 'e.g., Navy blue (#1E3A5F), Gold (#D4AF37)',
        help_text: 'Include hex codes if you have them',
        is_required: true,
        section: 'Brand Identity',
        sort_order: 1
      },
      {
        product_id: product.id,
        question_text: 'Do you have existing brand guidelines or a style guide?',
        question_type: 'select',
        options: ['Yes, I can share them', 'No, but I have preferences', 'No, I need help defining my style'],
        is_required: true,
        section: 'Brand Identity',
        sort_order: 2
      },
      {
        product_id: product.id,
        question_text: 'What visual style best represents your brand?',
        question_type: 'multiselect',
        options: ['Modern & Minimalist', 'Bold & Vibrant', 'Classic & Professional', 'Playful & Creative', 'Luxury & Elegant', 'Natural & Organic'],
        help_text: 'Select all that apply',
        is_required: true,
        section: 'Visual Preferences',
        sort_order: 3
      },
      {
        product_id: product.id,
        question_text: 'What types of creative assets do you need most?',
        question_type: 'multiselect',
        options: ['Social media graphics', 'Blog post images', 'Ad banners', 'Email headers', 'Promotional flyers', 'Infographics'],
        help_text: 'Select all that apply',
        is_required: true,
        section: 'Asset Types',
        sort_order: 4
      },
      {
        product_id: product.id,
        question_text: 'Please share your logo file or link to your logo',
        question_type: 'url',
        placeholder: 'Dropbox, Google Drive, or website URL',
        help_text: "We'll use this in your creative assets",
        is_required: false,
        section: 'Brand Assets',
        sort_order: 5
      },
      {
        product_id: product.id,
        question_text: 'Are there any brands or styles you admire that we can use as inspiration?',
        question_type: 'textarea',
        placeholder: "e.g., Apple's clean aesthetic, Nike's bold imagery",
        is_required: false,
        section: 'Visual Preferences',
        sort_order: 6
      },
      {
        product_id: product.id,
        question_text: 'Any specific imagery or themes to avoid?',
        question_type: 'textarea',
        placeholder: 'e.g., No stock photos of people shaking hands',
        is_required: false,
        section: 'Visual Preferences',
        sort_order: 7
      }
    ]

    const created = await prisma.onboarding_question_templates.createMany({
      data: questions
    })

    return NextResponse.json({
      success: true,
      message: `Created ${created.count} questions for AI Creative Assets`,
      count: created.count
    })
  } catch (error) {
    console.error('Failed to seed AI Creative questions:', error)
    return NextResponse.json({ error: 'Failed to seed questions' }, { status: 500 })
  }
}
