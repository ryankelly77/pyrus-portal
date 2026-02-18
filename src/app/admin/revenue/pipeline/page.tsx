'use client'

import dynamic from 'next/dynamic'

const PipelineDashboardEmbed = dynamic(
  () => import('@/components/pipeline/PipelineDashboardEmbed').then(mod => ({ default: mod.PipelineDashboardEmbed })),
  { loading: () => <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>Loading pipeline...</div> }
)

export default function PipelinePage() {
  return <PipelineDashboardEmbed />
}
