// Shared client data used across admin and client portal

export interface ClientData {
  id: string
  name: string
  initials: string
  avatarColor: string
  email: string
  primaryContact: string
  clientSince: string
  status: 'active' | 'paused' | 'onboarding'
  servicesCount: number
  hasWebsite: boolean
  hasContent: boolean
  websiteData?: {
    domain: string
    previewUrl: string
    plan: string
    carePlan: string
    status: 'active' | 'development' | 'maintenance'
    launchDate: string
    hosting: {
      provider: string
      uptime: string
      lastUpdated: string
    }
  }
}

export const clients: Record<string, ClientData> = {
  'tc-clinical': {
    id: 'tc-clinical',
    name: 'TC Clinical Services',
    initials: 'TC',
    avatarColor: '#885430',
    email: 'dlg.mdservices@gmail.com',
    primaryContact: 'Jon De La Garza',
    clientSince: 'Sep 2025',
    status: 'active',
    servicesCount: 4,
    hasWebsite: true,
    hasContent: true,
    websiteData: {
      domain: 'tc-clinicalservices.com',
      previewUrl: 'https://app.landingsite.ai/website-preview?id=8869fd44-f6ea-4bd7-bc24-92a7a14f17a5',
      plan: 'Seed Site (AI-Built)',
      carePlan: 'Website Care Plan',
      status: 'active',
      launchDate: 'Dec 30, 2025',
      hosting: {
        provider: 'Landingsite.ai',
        uptime: '99.9%',
        lastUpdated: 'Jan 3, 2026',
      },
    },
  },
  'raptor-vending': {
    id: 'raptor-vending',
    name: 'Raptor Vending',
    initials: 'RV',
    avatarColor: '#2563EB',
    email: 'info@raptorvending.com',
    primaryContact: 'Mike Reynolds',
    clientSince: 'Nov 2025',
    status: 'active',
    servicesCount: 2,
    hasWebsite: false,
    hasContent: false,
  },
  'raptor-services': {
    id: 'raptor-services',
    name: 'Raptor Services',
    initials: 'RS',
    avatarColor: '#7C3AED',
    email: 'contact@raptorservices.com',
    primaryContact: 'Sarah Chen',
    clientSince: 'Mar 2025',
    status: 'active',
    servicesCount: 5,
    hasWebsite: true,
    hasContent: true,
    websiteData: {
      domain: 'raptorservices.com',
      previewUrl: '',
      plan: 'Bloom',
      carePlan: 'WordPress Care',
      status: 'active',
      launchDate: 'Apr 15, 2025',
      hosting: {
        provider: 'WPEngine',
        uptime: '99.9%',
        lastUpdated: 'Dec 20, 2025',
      },
    },
  },
  'gohfr': {
    id: 'gohfr',
    name: 'Gohfr',
    initials: 'GO',
    avatarColor: '#0B7277',
    email: 'hello@gohfr.com',
    primaryContact: 'Alex Thompson',
    clientSince: 'Dec 2025',
    status: 'onboarding',
    servicesCount: 3,
    hasWebsite: true,
    hasContent: false,
  },
  'espronceda-law': {
    id: 'espronceda-law',
    name: 'Espronceda Law',
    initials: 'EL',
    avatarColor: '#DC2626',
    email: 'maria@espronceda.law',
    primaryContact: 'Maria Espronceda',
    clientSince: 'Aug 2025',
    status: 'active',
    servicesCount: 4,
    hasWebsite: true,
    hasContent: true,
  },
  'ruger': {
    id: 'ruger',
    name: 'Ruger',
    initials: 'RU',
    avatarColor: '#059669',
    email: 'contact@ruger.com',
    primaryContact: 'Ruger Team',
    clientSince: 'Jan 2026',
    status: 'active',
    servicesCount: 5,
    hasWebsite: false,
    hasContent: false,
  },
}

export function getClient(id: string): ClientData {
  return clients[id] || clients['tc-clinical']
}

export function getClientByViewingAs(viewingAs: string | null): ClientData {
  if (viewingAs && clients[viewingAs]) {
    return clients[viewingAs]
  }
  return clients['tc-clinical']
}
