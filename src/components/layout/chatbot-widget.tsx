'use client'

import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

export function ChatbotWidget() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client } = useClientData(viewingAs)

  // Only show the active customer chatbot for non-pending clients
  // Prospect chatbot is handled separately on Welcome and Recommendations pages
  if (client.status === 'pending') {
    return null
  }

  return (
    <Script
      src="https://widgets.leadconnectorhq.com/loader.js"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id="6879429b33ee4b1983428d6c"
      strategy="lazyOnload"
    />
  )
}
