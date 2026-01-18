export const CLIENT_STATUSES = [
  'active',
  'paused',
  'churned',
  'prospect',
] as const

export type ClientStatus = typeof CLIENT_STATUSES[number]
