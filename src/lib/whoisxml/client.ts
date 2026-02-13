// WhoisXML API client for domain expiry lookups
// API documentation: https://whoisxmlapi.com/

const WHOISXML_API_URL = 'https://www.whoisxmlapi.com/whoisserver/WhoisService'

interface WhoisXMLResponse {
  WhoisRecord?: {
    domainName?: string
    registryData?: {
      expiresDate?: string
      registrarName?: string
    }
    expiresDate?: string
    registrarName?: string
  }
  ErrorMessage?: {
    msg: string
  }
}

export interface DomainInfo {
  domain: string
  expiresAt: string // Formatted date e.g., "Apr 12, 2027"
  expiresTimestamp: number // Unix timestamp in ms
  daysRemaining: number
  registrar: string
}

export function isWhoisXMLConfigured(): boolean {
  return !!process.env.WHOISXML_API_KEY
}

export async function getDomainExpiry(domain: string): Promise<DomainInfo | null> {
  const apiKey = process.env.WHOISXML_API_KEY

  if (!apiKey) {
    console.warn('[WhoisXML] WHOISXML_API_KEY not configured - domain expiry lookups disabled')
    return null
  }

  console.log(`[WhoisXML] Looking up domain: ${domain}`)

  // Clean the domain (remove protocol, www, paths)
  let cleanDomain = domain
  try {
    if (domain.includes('://')) {
      const url = new URL(domain)
      cleanDomain = url.hostname
    }
    cleanDomain = cleanDomain.replace(/^www\./, '').toLowerCase()
  } catch {
    // Keep original if parsing fails
  }

  try {
    const params = new URLSearchParams({
      apiKey: apiKey,
      domainName: cleanDomain,
      outputFormat: 'JSON',
    })

    const response = await fetch(`${WHOISXML_API_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('WhoisXML API error:', response.status, response.statusText)
      return null
    }

    const data: WhoisXMLResponse = await response.json()

    if (data.ErrorMessage) {
      console.error('WhoisXML API returned error:', data.ErrorMessage.msg)
      return null
    }

    if (!data.WhoisRecord) {
      console.error('WhoisXML API returned no record')
      return null
    }

    // Get expiry date - try registryData first, then top-level
    const expiresDateStr = data.WhoisRecord.registryData?.expiresDate || data.WhoisRecord.expiresDate
    const registrar = data.WhoisRecord.registryData?.registrarName || data.WhoisRecord.registrarName || 'Unknown'

    if (!expiresDateStr) {
      console.warn('No expiry date found for domain:', cleanDomain)
      return null
    }

    // Parse the expiry date
    const expiresDate = new Date(expiresDateStr)
    if (isNaN(expiresDate.getTime())) {
      console.error('Failed to parse expiry date:', expiresDateStr)
      return null
    }

    const daysRemaining = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return {
      domain: cleanDomain,
      expiresAt: expiresDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      expiresTimestamp: expiresDate.getTime(),
      daysRemaining,
      registrar,
    }
  } catch (error: any) {
    console.error('Error fetching WhoisXML data:', error)
    return null
  }
}
