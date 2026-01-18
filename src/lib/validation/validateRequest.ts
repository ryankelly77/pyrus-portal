import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

export async function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  request: NextRequest
) {
  const body = await request.json().catch(() => null)

  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      ),
    }
  }

  return { data: result.data }
}
