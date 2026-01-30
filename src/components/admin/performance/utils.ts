// Shared utility functions for performance components

export function getScoreColor(score: number): string {
  if (score >= 80) return '#16a34a' // thriving - dark green
  if (score >= 60) return '#22c55e' // healthy - light green
  if (score >= 40) return '#eab308' // needs attention - yellow
  if (score >= 20) return '#f97316' // at risk - orange
  return '#dc2626' // critical - red
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    thriving: 'Thriving',
    healthy: 'Healthy',
    needs_attention: 'Needs Attention',
    at_risk: 'At Risk',
    critical: 'Critical',
    churn_risk: 'Churn Risk',
    premium_candidate: 'Premium',
    fast_tracker: 'Fast Tracker',
  }
  return labels[status] || status
}

export function getStageIcon(stage: string): string {
  const icons: Record<string, string> = {
    seedling: '\u{1F331}',
    sprouting: '\u{1F33F}',
    blooming: '\u{1F338}',
    harvesting: '\u{1F33E}',
  }
  return icons[stage] || ''
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    seedling: 'Seedling',
    sprouting: 'Sprouting',
    blooming: 'Blooming',
    harvesting: 'Harvesting',
  }
  return labels[stage] || stage
}

export function getPlanLabel(planType: string): string {
  const labels: Record<string, string> = {
    seo: 'SEO Only',
    paid_media: 'Paid Only',
    ai_optimization: 'AI Only',
    full_service: 'Multi Service',
  }
  return labels[planType] || planType.replace('_', ' ')
}

export function getAlertTypeLabel(alertType: string | null): string {
  if (!alertType) return ''
  const labels: Record<string, string> = {
    performance_focus: 'Performance',
    milestone: 'Milestone',
    intervention: 'Intervention',
    general_update: 'Update',
  }
  return labels[alertType] || alertType.replace('_', ' ')
}

export function getTrendArrow(delta: number): string {
  if (delta > 5) return '\u2191' // up arrow
  if (delta < -5) return '\u2193' // down arrow
  return '\u2192' // right arrow (stable)
}

export function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

export const ALERT_TEMPLATES = {
  performance_focus: `Our team is actively focused on improving your account performance. We're implementing new strategies and you should see improvements soon. Questions? Chat with us anytime.`,
  milestone: `Congratulations! Your metrics have shown significant improvement. This puts you among our top-performing accounts. Keep up the great work!`,
  intervention: `We've identified some areas where your account needs attention. Our team is prioritizing your account this week. We'll have an update for you soon.`,
  general_update: `Here's a quick update on your account progress. Our team continues to work on optimizing your results.`,
}
