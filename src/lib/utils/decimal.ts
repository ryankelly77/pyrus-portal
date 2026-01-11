/**
 * Utility functions for handling Prisma Decimal types
 * Prisma returns Decimal as objects with toString() method
 */

// Prisma Decimal type (has toNumber() and toString() methods)
type DecimalLike = { toString(): string; toNumber?(): number }

/**
 * Safely parse a Prisma Decimal or number to a JavaScript number
 * Handles: Decimal objects, strings, numbers, null/undefined
 */
export function parseDecimal(value: DecimalLike | string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  // Handle Prisma Decimal object
  if (typeof value === 'object' && 'toString' in value) {
    const parsed = parseFloat(value.toString())
    return isNaN(parsed) ? 0 : parsed
  }

  return 0
}

/**
 * Format a decimal value as currency
 */
export function formatCurrency(
  value: DecimalLike | string | number | null | undefined,
  options: { showCents?: boolean; prefix?: string } = {}
): string {
  const { showCents = true, prefix = '$' } = options
  const num = parseDecimal(value)

  if (showCents) {
    return `${prefix}${num.toFixed(2)}`
  }

  return `${prefix}${Math.round(num).toLocaleString()}`
}

/**
 * Format as monthly price
 */
export function formatMonthlyPrice(value: DecimalLike | string | number | null | undefined): string {
  return `${formatCurrency(value)}/mo`
}

/**
 * Sum an array of decimal values
 */
export function sumDecimals(values: Array<DecimalLike | string | number | null | undefined>): number {
  return values.reduce<number>((sum, val) => sum + parseDecimal(val), 0)
}

/**
 * Check if a decimal value is greater than zero
 */
export function isPositive(value: DecimalLike | string | number | null | undefined): boolean {
  return parseDecimal(value) > 0
}
