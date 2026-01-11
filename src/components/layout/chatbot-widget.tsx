'use client'

import Script from 'next/script'
import { useSearchParams, usePathname } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

export function ChatbotWidget() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const viewingAs = searchParams.get('viewingAs')
  const { client } = useClientData(viewingAs)

  // Pages that have their own chat widget (d6b)
  const pagesWithOwnWidget = ['/getting-started', '/recommendations']
  const hasOwnWidget = pagesWithOwnWidget.some(page => pathname?.startsWith(page))

  // Don't show this widget on pages that have their own widget
  // or for pending clients (prospects)
  if (hasOwnWidget || client.status === 'pending') {
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
