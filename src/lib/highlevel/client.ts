/**
 * HighLevel API Client
 * Documentation: https://marketplace.gohighlevel.com/docs/
 * Base URL: https://services.leadconnectorhq.com
 */

const HIGHLEVEL_API_URL = 'https://services.leadconnectorhq.com'

interface HighLevelConfig {
  apiKey: string
  locationId: string
}

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

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig()

  const response = await fetch(`${HIGHLEVEL_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`HighLevel API error: ${response.status} ${errorText}`)
    throw new Error(`HighLevel API error: ${response.status}`)
  }

  return response.json()
}

// Contact types
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

// Conversation types
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

// Message types
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
    }
  }
}

interface ConversationsResponse {
  conversations: HighLevelConversation[]
  total?: number
}

interface MessagesResponse {
  messages: HighLevelMessage[]
  nextPage?: boolean
  lastMessageId?: string
}

interface ContactSearchResponse {
  contacts: HighLevelContact[]
  total?: number
}

/**
 * Search for conversations by contact ID
 */
export async function getConversationsByContactId(
  contactId: string
): Promise<HighLevelConversation[]> {
  const config = getConfig()

  const response = await makeRequest<ConversationsResponse>(
    `/conversations/search?locationId=${config.locationId}&contactId=${contactId}`
  )

  return response.conversations || []
}

/**
 * Get messages for a conversation
 */
export async function getMessagesByConversationId(
  conversationId: string,
  limit: number = 50
): Promise<HighLevelMessage[]> {
  const response = await makeRequest<MessagesResponse>(
    `/conversations/${conversationId}/messages?limit=${limit}`
  )

  return response.messages || []
}

/**
 * Search for a contact by email
 */
export async function getContactByEmail(
  email: string
): Promise<HighLevelContact | null> {
  const config = getConfig()

  try {
    const response = await makeRequest<ContactSearchResponse>(
      `/contacts/?locationId=${config.locationId}&query=${encodeURIComponent(email)}&limit=1`
    )

    if (response.contacts && response.contacts.length > 0) {
      // Verify email match (search might return partial matches)
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
 */
export async function getAllMessagesForContact(
  contactId: string,
  limit: number = 100
): Promise<HighLevelMessage[]> {
  try {
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
        allMessages.push(...messages)
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
  // Determine the communication type
  let commType = 'chat'
  let title = 'Message'

  switch (message.type) {
    case 'SMS':
      commType = 'sms'
      title = message.direction === 'inbound' ? 'SMS Received' : 'SMS Sent'
      break
    case 'Email':
      commType = 'email_highlevel'
      title = message.direction === 'inbound' ? 'Email Received' : 'Email Sent'
      break
    case 'Live_Chat':
    case 'Custom':
      commType = 'chat'
      title = message.direction === 'inbound' ? 'Chat Message' : 'Chat Reply'
      break
    case 'FB':
      commType = 'chat_facebook'
      title = 'Facebook Message'
      break
    case 'IG':
      commType = 'chat_instagram'
      title = 'Instagram Message'
      break
    case 'WhatsApp':
      commType = 'chat_whatsapp'
      title = 'WhatsApp Message'
      break
    default:
      commType = 'chat'
      title = message.direction === 'inbound' ? 'Message Received' : 'Message Sent'
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
      messageType: message.type,
      direction: message.direction,
      attachments: message.attachments,
      emailMeta: message.meta?.email,
    },
    highlightType: null,
    sentAt: message.dateAdded || null,
    direction: message.direction,
    source: 'highlevel',
  }
}
