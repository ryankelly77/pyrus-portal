/**
 * Global Email Template Variables
 *
 * These variables are available on ALL email templates and are
 * automatically injected when sending any templated email.
 */

export interface TemplateVariable {
  key: string
  description: string
  example: string
}

/**
 * Global variables available on every email template
 */
export const GLOBAL_EMAIL_VARIABLES: TemplateVariable[] = [
  {
    key: 'firstName',
    description: "Recipient's first name",
    example: 'John',
  },
  {
    key: 'lastName',
    description: "Recipient's last name",
    example: 'Smith',
  },
  {
    key: 'fullName',
    description: "Recipient's full name",
    example: 'John Smith',
  },
  {
    key: 'email',
    description: "Recipient's email address",
    example: 'john@example.com',
  },
  {
    key: 'clientName',
    description: 'Client/company name',
    example: 'Acme Corp',
  },
  {
    key: 'portalUrl',
    description: 'Link to the client portal',
    example: 'https://portal.pyrusdigitalmedia.com',
  },
  {
    key: 'supportEmail',
    description: 'Support email address',
    example: 'support@pyrusdigitalmedia.com',
  },
  {
    key: 'currentDate',
    description: "Today's date (formatted)",
    example: 'February 16, 2026',
  },
  {
    key: 'currentYear',
    description: 'Current year',
    example: '2026',
  },
  {
    key: 'proposalSentDate',
    description: 'Date the recommendation/proposal was first sent',
    example: 'February 16, 2026',
  },
]

/**
 * Get global variable values for email sending
 * These are injected automatically into every email
 */
export function getGlobalVariableValues(): Record<string, string> {
  const now = new Date()

  return {
    portalUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com',
    supportEmail: 'support@pyrusdigitalmedia.com',
    currentDate: now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    currentYear: now.getFullYear().toString(),
  }
}

/**
 * Merge global variables with template-specific variables
 * Removes duplicates (template-specific takes precedence)
 */
export function mergeWithGlobalVariables(
  templateVariables: TemplateVariable[]
): TemplateVariable[] {
  const templateKeys = new Set(templateVariables.map((v) => v.key))

  // Filter out global variables that are already defined in template
  const uniqueGlobalVars = GLOBAL_EMAIL_VARIABLES.filter(
    (v) => !templateKeys.has(v.key)
  )

  return [...templateVariables, ...uniqueGlobalVars]
}
