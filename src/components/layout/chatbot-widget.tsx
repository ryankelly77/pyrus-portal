'use client'

import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

// Widget IDs from LeadConnector
const PROSPECT_WIDGET_ID = '6879420133ee4bc0c5428d6b' // d6b - for prospects
const ACTIVE_CLIENT_WIDGET_ID = '6879429b33ee4b1983428d6c' // d6c - for active clients

export function ChatbotWidget() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client } = useClientData(viewingAs)

  // Determine which widget to show based on growth stage
  const activeStages = ['seedling', 'sprouting', 'blooming', 'harvesting']
  const isProspect = client.growthStage === 'prospect'
  const isActiveClient = activeStages.includes(client.growthStage || '')

  // Show prospect widget for prospects, active client widget for active stages
  if (isProspect) {
    return (
      <Script
        src="https://widgets.leadconnectorhq.com/loader.js"
        data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
        data-widget-id={PROSPECT_WIDGET_ID}
        strategy="lazyOnload"
      />
    )
  }

  if (isActiveClient) {
    return (
      <Script
        src="https://widgets.leadconnectorhq.com/loader.js"
        data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
        data-widget-id={ACTIVE_CLIENT_WIDGET_ID}
        strategy="lazyOnload"
      />
    )
  }

  // No widget for unknown stages
  return null
}
