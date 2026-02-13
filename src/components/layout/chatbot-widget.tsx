'use client'

import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useClientData } from '@/hooks/useClientData'

// Widget IDs from LeadConnector
const PROSPECT_WIDGET_ID = '6879420133ee4bc0c5428d6b' // d6b - for prospects
const ACTIVE_CLIENT_WIDGET_ID = '6879429b33ee4b1983428d6c' // d6c - for active clients

export function ChatbotWidget() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)

  // Determine which widget to show based on growth stage
  const activeStages = ['seedling', 'sprouting', 'blooming', 'harvesting']
  const isProspect = client.growthStage === 'prospect'
  const isActiveClient = activeStages.includes(client.growthStage || '')

  // Determine current widget ID
  const currentWidgetId = isProspect ? PROSPECT_WIDGET_ID : isActiveClient ? ACTIVE_CLIENT_WIDGET_ID : null

  // Clean up LeadConnector widgets when component unmounts or widget changes
  useEffect(() => {
    return () => {
      // Remove any injected LeadConnector elements on unmount
      const elements = document.querySelectorAll(
        '[id*="lc_text"], [id*="leadconnector"], [class*="lc-text-widget"], #chat-widget-container'
      )
      elements.forEach(el => el.remove())
    }
  }, [currentWidgetId])

  // Don't render while loading to prevent flash of wrong widget
  if (loading) {
    return null
  }

  // Show prospect widget for prospects
  if (isProspect) {
    return (
      <Script
        key={`chat-widget-${PROSPECT_WIDGET_ID}`}
        src="https://widgets.leadconnectorhq.com/loader.js"
        data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
        data-widget-id={PROSPECT_WIDGET_ID}
        strategy="lazyOnload"
      />
    )
  }

  // Show active client widget for active stages
  if (isActiveClient) {
    return (
      <Script
        key={`chat-widget-${ACTIVE_CLIENT_WIDGET_ID}`}
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
