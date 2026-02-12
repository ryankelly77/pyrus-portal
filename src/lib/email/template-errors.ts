/**
 * Custom error classes for email template service
 */

/**
 * Thrown when a requested template does not exist in the database
 */
export class TemplateNotFoundError extends Error {
  public readonly slug: string

  constructor(slug: string) {
    super(`Email template not found: ${slug}`)
    this.name = 'TemplateNotFoundError'
    this.slug = slug
  }
}

/**
 * Thrown when a template exists but is deactivated (is_active = false)
 */
export class TemplateInactiveError extends Error {
  public readonly slug: string

  constructor(slug: string) {
    super(`Email template is inactive: ${slug}`)
    this.name = 'TemplateInactiveError'
    this.slug = slug
  }
}

/**
 * Thrown when a template slug fails validation
 */
export class InvalidSlugError extends Error {
  public readonly slug: string

  constructor(slug: string) {
    super(`Invalid template slug: ${slug}. Slugs must be 1-100 characters and contain only lowercase letters, numbers, and hyphens.`)
    this.name = 'InvalidSlugError'
    this.slug = slug
  }
}

/**
 * Thrown when variable rendering fails
 */
export class TemplateRenderError extends Error {
  public readonly slug: string
  public readonly details: string

  constructor(slug: string, details: string) {
    super(`Failed to render template ${slug}: ${details}`)
    this.name = 'TemplateRenderError'
    this.slug = slug
    this.details = details
  }
}
