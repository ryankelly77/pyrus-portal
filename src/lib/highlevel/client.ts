/**
 * HighLevel API Client
 * Documentation: https://marketplace.gohighlevel.com/docs/
 *
 * V1 API (rest.gohighlevel.com) - Works with Location API Keys
 *   - Contacts: GET, CREATE, UPDATE
 *   - Notes, Tasks, Tags
 *   - Limited functionality
 *
 * V2 API (services.leadconnectorhq.com) - Requires OAuth
 *   - Full conversations/messages access
 *   - More endpoints
 */

import { Pool } from 'pg'

const HIGHLEVEL_API_V1_URL = 'https://rest.gohighlevel.com/v1'
const HIGHLEVEL_API_V2_URL = 'https://services.leadconnectorhq.com'
const HIGHLEVEL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'

interface HighLevelConfig {
  apiKey: string
  locationId: string
}

interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

// Cache for OAuth tokens to avoid repeated DB queries
let tokenCache: { tokens: OAuthTokens; fetchedAt: number } | null = null
const TOKEN_CACHE_TTL = 60000 // 1 minute

function getConfig(): HighLevelConfig {
  const apiKey = process.env.HIGHLEVEL_API_KEY
  const locationId = process.env.HIGHLEVEL_LOCATION_ID

  if (!apiKey) {
    throw new Error('HIGHLEVEL_API_KEY environment variable is not set')
  }
  if (!locationId) {
    throw new Error('HIGHLEVEL_LOCATION_ID environment variable is not set')
  }

  return { apiKey, locationId }
}

export function isHighLevelConfigured(): boolean {
  return !!(process.env.HIGHLEVEL_API_KEY && process.env.HIGHLEVEL_LOCATION_ID)
}

/**
 * Get OAuth tokens from database
 */
async function getOAuthTokens(): Promise<OAuthTokens | null> {
  // Check cache first
  if (tokenCache && Date.now() - tokenCache.fetchedAt < TOKEN_CACHE_TTL) {
    return tokenCache.tokens
  }

  const locationId = process.env.HIGHLEVEL_LOCATION_ID
  if (!locationId) return null

  try {
    // Create a temporary pool for this query (since we can't import dbPool here due to circular deps)
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    })

    const result = await pool.query(
      `SELECT access_token, refresh_token, expires_at
       FROM highlevel_oauth
       WHERE location_id = $1`,
      [locationId]
    )

    await pool.end()

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    const tokens: OAuthTokens = {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at),
    }

    // Update cache
    tokenCache = { tokens, fetchedAt: Date.now() }

    return tokens
  } catch (error) {
    console.error('Error fetching OAuth tokens:', error)
    return null
  }
}

/**
 * Refresh OAuth tokens if expired
 */
async function refreshOAuthTokens(refreshToken: string): Promise<OAuthTokens | null> {
  const clientId = process.env.HIGHLEVEL_CLIENT_ID
  const clientSecret = process.env.HIGHLEVEL_CLIENT_SECRET
  const locationId = process.env.HIGHLEVEL_LOCATION_ID

  if (!clientId || !clientSecret || !locationId) {
    console.error('Missing OAuth configuration for token refresh')
    return null
  }

  try {
    const response = await fetch(HIGHLEVEL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token refresh failed:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000)

    // Update database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    })

    await pool.query(
      `UPDATE highlevel_oauth
       SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
       WHERE location_id = $4`,
      [data.access_token, data.refresh_token, expiresAt, locationId]
    )

    await pool.end()

    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    }

    // Update cache
    tokenCache = { tokens, fetchedAt: Date.now() }

    console.log('HighLevel OAuth tokens refreshed successfully')
    return tokens
  } catch (error) {
    console.error('Error refreshing OAuth tokens:', error)
    return null
  }
}

/**
 * Get valid OAuth access token (refreshes if needed)
 */
async function getValidAccessToken(): Promise<string | null> {
  let tokens = await getOAuthTokens()

  if (!tokens) {
    return null
  }

  // Check if token is expired or about to expire (5 min buffer)
  const now = new Date()
  const expiresAt = new Date(tokens.expiresAt)
  const bufferMs = 5 * 60 * 1000 // 5 minutes

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    console.log('HighLevel OAuth token expired or expiring soon, refreshing...')
    tokens = await refreshOAuthTokens(tokens.refreshToken)
    if (!tokens) {
      return null
    }
  }

  return tokens.accessToken
}

/**
 * Check if OAuth is configured and tokens are available
 */
export async function isOAuthConfigured(): Promise<boolean> {
  const token = await getValidAccessToken()
  return token !== null
}

// ============ V1 API (Location API Key) ============

async function makeRequestV1<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig()

  const response = await fetch(`${HIGHLEVEL_API_V1_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`HighLevel V1 API error: ${response.status} ${errorText}`)
    throw new Error(`HighLevel API error: ${response.status}`)
  }

  return response.json()
}

// ============ V2 API (OAuth) ============

async function makeRequestV2<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  const accessToken = await getValidAccessToken()

  if (!accessToken) {
    console.log('HighLevel V2 API: No valid OAuth token available')
    return null
  }

  const response = await fetch(`${HIGHLEVEL_API_V2_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`HighLevel V2 API error: ${response.status} ${errorText}`)
    throw new Error(`HighLevel V2 API error: ${response.status}`)
  }

  return response.json()
}

// ============ Types ============

export interface HighLevelContact {
  id: string
  locationId: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  name?: string
  dateAdded?: string
  tags?: string[]
}

export interface HighLevelConversation {
  id: string
  contactId: string
  locationId: string
  lastMessageBody?: string
  lastMessageDate?: string
  lastMessageType?: string
  type?: string
  unreadCount?: number
  starred?: boolean
  inbox?: boolean
  deleted?: boolean
  dateAdded?: string
  dateUpdated?: string
}

export interface HighLevelMessage {
  id: string
  conversationId: string
  locationId: string
  contactId: string
  body?: string
  contentType?: string
  type: 'SMS' | 'Email' | 'GMB' | 'FB' | 'IG' | 'WhatsApp' | 'Live_Chat' | 'Custom' | string
  direction: 'inbound' | 'outbound'
  status?: string
  dateAdded?: string
  messageType?: string
  source?: string
  attachments?: Array<{
    url: string
    type: string
  }>
  meta?: {
    email?: {
      subject?: string
      from?: string
      to?: string[]
      direction?: 'inbound' | 'outbound'
    }
  }
}

interface ConversationsResponse {
  conversations: HighLevelConversation[]
  total?: number
}

interface MessagesResponse {
  messages: {
    messages: HighLevelMessage[]
    nextPage?: boolean
    lastMessageId?: string
  } | HighLevelMessage[]
}

interface ContactSearchResponse {
  contacts: HighLevelContact[]
  total?: number
  meta?: { total: number }
}

// ============ API Functions ============

/**
 * Search for conversations by contact ID (V2 OAuth API)
 */
export async function getConversationsByContactId(
  contactId: string
): Promise<HighLevelConversation[]> {
  const config = getConfig()

  try {
    const response = await makeRequestV2<ConversationsResponse>(
      `/conversations/search?locationId=${config.locationId}&contactId=${contactId}`
    )

    if (!response) {
      console.log('HighLevel: OAuth not configured, cannot fetch conversations')
      return []
    }

    return response.conversations || []
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return []
  }
}

/**
 * Get messages for a conversation (V2 OAuth API)
 */
export async function getMessagesByConversationId(
  conversationId: string,
  limit: number = 50
): Promise<HighLevelMessage[]> {
  try {
    const response = await makeRequestV2<MessagesResponse>(
      `/conversations/${conversationId}/messages?limit=${limit}`
    )

    if (!response) {
      console.log('HighLevel: OAuth not configured, cannot fetch messages')
      return []
    }

    // Handle nested response structure: { messages: { messages: [...] } }
    const messagesData = response.messages
    if (Array.isArray(messagesData)) {
      return messagesData
    } else if (messagesData && Array.isArray(messagesData.messages)) {
      return messagesData.messages
    }
    return []
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

/**
 * Get a contact by ID (V1 API)
 */
export async function getContactById(
  contactId: string
): Promise<HighLevelContact | null> {
  try {
    const response = await makeRequestV1<{ contact: HighLevelContact }>(
      `/contacts/${contactId}`
    )
    return response.contact || null
  } catch (error) {
    console.error('Error getting contact by ID:', error)
    return null
  }
}

/**
 * Search for a contact by email (V1 API)
 */
export async function getContactByEmail(
  email: string
): Promise<HighLevelContact | null> {
  try {
    const response = await makeRequestV1<ContactSearchResponse>(
      `/contacts/?query=${encodeURIComponent(email)}&limit=10`
    )

    if (response.contacts && response.contacts.length > 0) {
      const contact = response.contacts.find(
        c => c.email?.toLowerCase() === email.toLowerCase()
      )
      return contact || null
    }

    return null
  } catch (error) {
    console.error('Error searching for contact by email:', error)
    return null
  }
}

/**
 * Get all messages for a contact (combines all their conversations)
 * Requires OAuth to be configured
 */
export async function getAllMessagesForContact(
  contactId: string,
  limit: number = 100
): Promise<HighLevelMessage[]> {
  try {
    // Check if OAuth is available
    const hasOAuth = await isOAuthConfigured()
    if (!hasOAuth) {
      console.log('HighLevel: OAuth not configured, cannot fetch messages')
      return []
    }

    // Get all conversations for this contact
    const conversations = await getConversationsByContactId(contactId)

    if (conversations.length === 0) {
      return []
    }

    // Fetch messages from each conversation
    const allMessages: HighLevelMessage[] = []
    const messagesPerConversation = Math.ceil(limit / conversations.length)

    for (const conversation of conversations) {
      try {
        const messages = await getMessagesByConversationId(
          conversation.id,
          messagesPerConversation
        )
        // Ensure messages is an array before spreading
        if (Array.isArray(messages)) {
          allMessages.push(...messages)
        }
      } catch (error) {
        console.error(`Error fetching messages for conversation ${conversation.id}:`, error)
      }
    }

    // Sort by date and limit
    return allMessages
      .sort((a, b) => {
        const dateA = new Date(a.dateAdded || 0).getTime()
        const dateB = new Date(b.dateAdded || 0).getTime()
        return dateB - dateA
      })
      .slice(0, limit)
  } catch (error) {
    console.error('Error fetching all messages for contact:', error)
    return []
  }
}

/**
 * Transform a HighLevel message to our communication format
 */
export function transformHighLevelMessage(message: HighLevelMessage): {
  id: string
  type: string
  title: string
  subject: string | null
  body: string | null
  status: string
  metadata: Record<string, any>
  highlightType: string | null
  sentAt: string | null
  direction: 'inbound' | 'outbound'
  source: 'highlevel'
} {
  let commType = 'chat'
  let title = 'Message'

  // Handle both old format (SMS, Email) and new format (TYPE_SMS, TYPE_EMAIL)
  const msgType = message.messageType || message.type
  const direction = message.direction || message.meta?.email?.direction || 'outbound'

  switch (msgType) {
    case 'SMS':
    case 'TYPE_SMS':
      commType = 'sms'
      title = direction === 'inbound' ? 'SMS Received' : 'SMS Sent'
      break
    case 'Email':
    case 'TYPE_EMAIL':
      commType = 'email_highlevel'
      title = direction === 'inbound' ? 'Email Received' : 'Email Sent'
      break
    case 'Live_Chat':
    case 'Custom':
    case 'TYPE_WEBCHAT':
    case 'TYPE_LIVE_CHAT':
      commType = 'chat'
      title = direction === 'inbound' ? 'Chat Message' : 'Chat Reply'
      break
    case 'FB':
    case 'TYPE_FB':
      commType = 'chat_facebook'
      title = 'Facebook Message'
      break
    case 'IG':
    case 'TYPE_IG':
      commType = 'chat_instagram'
      title = 'Instagram Message'
      break
    case 'WhatsApp':
    case 'TYPE_WHATSAPP':
      commType = 'chat_whatsapp'
      title = 'WhatsApp Message'
      break
    default:
      commType = 'chat'
      title = direction === 'inbound' ? 'Message Received' : 'Message Sent'
  }

  return {
    id: `hl_${message.id}`,
    type: commType,
    title,
    subject: message.meta?.email?.subject || null,
    body: message.body || null,
    status: message.status || 'delivered',
    metadata: {
      highlevelMessageId: message.id,
      highlevelConversationId: message.conversationId,
      messageType: msgType,
      direction: direction,
      attachments: message.attachments,
      emailMeta: message.meta?.email,
    },
    highlightType: null,
    sentAt: message.dateAdded || null,
    direction: direction as 'inbound' | 'outbound',
    source: 'highlevel',
  }
}
