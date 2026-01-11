'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'

type SettingsTab = 'profile' | 'subscription' | 'billing' | 'security'

interface SubscriptionData {
  subscription: {
    id: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    monthlyAmount: number
    createdAt: string
  } | null
  services: Array<{
    id: string
    name: string
    category: string | null
    price: number
    quantity: number
    type: 'product' | 'bundle'
  }>
  paymentMethods: Array<{
    id: string
    brand: string
    last4: string
    expMonth: number
    expYear: number
    isDefault: boolean
  }>
  invoices: Array<{
    id: string
    number: string | null
    date: string
    amount: number
    status: string
    pdfUrl: string | null
  }>
  billingEmail: string | null
  clientName: string
  clientSince: string | null
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  usePageView({ page: '/settings', pageName: 'Settings' })

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  // Fetch subscription data when switching to subscription or billing tab
  useEffect(() => {
    if ((activeTab === 'subscription' || activeTab === 'billing') && !subscriptionData && !subscriptionLoading) {
      setSubscriptionLoading(true)
      setSubscriptionError(null)

      let url = '/api/client/subscription'
      if (viewingAs) {
        url += `?clientId=${viewingAs}`
      }

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch subscription data')
          return res.json()
        })
        .then((data) => {
          setSubscriptionData(data)
        })
        .catch((err) => {
          console.error('Error fetching subscription:', err)
          setSubscriptionError(err.message)
        })
        .finally(() => {
          setSubscriptionLoading(false)
        })
    }
  }, [activeTab, subscriptionData, subscriptionLoading, viewingAs])

  // Parse first and last name from contactName
  const nameParts = client.contactName.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  // Show loading state while fetching client data
  if (loading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Settings</h1>
          </div>
        </div>
        <div className="client-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Settings</h1>
        </div>
        <div className="client-top-header-right">
          <Link href="/notifications" className="btn-icon has-notification">
            <span className="notification-badge"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </Link>
          <Link href="/settings" className="user-menu-link">
            <div className="user-avatar-small">
              <span>{client.initials}</span>
            </div>
            <span className="user-name">{client.contactName}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Settings Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`settings-tab ${activeTab === 'subscription' ? 'active' : ''} ${client.status === 'pending' ? 'locked' : ''}`}
            onClick={() => client.status !== 'pending' && setActiveTab('subscription')}
            disabled={client.status === 'pending'}
            title={client.status === 'pending' ? 'Available after subscription' : ''}
          >
            Subscription &amp; Services
            {client.status === 'pending' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginLeft: '0.25rem', opacity: 0.5 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            )}
          </button>
          <button
            className={`settings-tab ${activeTab === 'billing' ? 'active' : ''} ${client.status === 'pending' ? 'locked' : ''}`}
            onClick={() => client.status !== 'pending' && setActiveTab('billing')}
            disabled={client.status === 'pending'}
            title={client.status === 'pending' ? 'Available after subscription' : ''}
          >
            Payment &amp; Billing
            {client.status === 'pending' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginLeft: '0.25rem', opacity: 0.5 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            )}
          </button>
          <button
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
        </div>

        {/* Profile Tab */}
        <div className={`settings-tab-content ${activeTab === 'profile' ? 'active' : ''}`} id="profile-tab">
          <div className="settings-layout">
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Profile Information</h2>
                <p>Update your account details and contact information</p>
              </div>
              <div className="settings-card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-input" defaultValue={firstName} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-input" defaultValue={lastName} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" defaultValue={client.contactEmail || ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" defaultValue={client.contactPhone || ''} placeholder="(555) 555-5555" />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-input" defaultValue={client.name} disabled />
                  <p className="form-hint">Contact support to change your company name</p>
                </div>
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-primary">Save Changes</button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Notification Preferences</h2>
                <p>Choose how you want to receive updates</p>
              </div>
              <div className="settings-card-body">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <h4>Email Notifications</h4>
                    <p>Receive updates about your campaigns via email</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <h4>Result Alerts</h4>
                    <p>Get notified when your campaigns hit milestones</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <h4>Monthly Reports</h4>
                    <p>Receive a monthly summary of your marketing performance</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription & Services Tab */}
        <div className={`settings-tab-content ${activeTab === 'subscription' ? 'active' : ''}`} id="subscription-tab">
          <div className="settings-layout">
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Current Subscription</h2>
                <p>Your active plan and next billing date</p>
              </div>
              <div className="settings-card-body">
                {subscriptionLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ width: 32, height: 32 }}></div>
                  </div>
                ) : subscriptionData?.subscription ? (
                  <div className="subscription-overview">
                    <div className="subscription-meta">
                      <div className="meta-item">
                        <span className="meta-label">Status</span>
                        <span className="meta-value" style={{ textTransform: 'capitalize', color: subscriptionData.subscription.status === 'active' ? '#2E7D32' : undefined }}>
                          {subscriptionData.subscription.status}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Monthly Amount</span>
                        <span className="meta-value">${subscriptionData.subscription.monthlyAmount.toLocaleString()}/mo</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Next Billing Date</span>
                        <span className="meta-value">
                          {new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Client Since</span>
                        <span className="meta-value">{subscriptionData.clientSince || client.clientSince || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="subscription-overview">
                    <div className="subscription-meta">
                      <div className="meta-item">
                        <span className="meta-label">Status</span>
                        <span className="meta-value" style={{ textTransform: 'capitalize' }}>{client.status || 'N/A'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Client Since</span>
                        <span className="meta-value">{client.clientSince || 'N/A'}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#5A6358', marginTop: '1rem' }}>
                      Subscription details will be available once your services are activated.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Active Services</h2>
                <p>Services included in your subscription</p>
              </div>
              <div className="settings-card-body">
                {subscriptionLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ width: 32, height: 32 }}></div>
                  </div>
                ) : subscriptionData?.services && subscriptionData.services.length > 0 ? (
                  <div className="services-list">
                    {subscriptionData.services.map((service) => (
                      <div key={service.id} className="service-item" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 0',
                        borderBottom: '1px solid #E8EDE6'
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1A1F18' }}>{service.name}</div>
                          {service.category && (
                            <div style={{ fontSize: '0.875rem', color: '#5A6358', marginTop: '0.25rem' }}>
                              {service.category}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 500, color: '#1A1F18' }}>
                            ${service.price.toLocaleString()}/mo
                          </div>
                          {service.quantity > 1 && (
                            <div style={{ fontSize: '0.875rem', color: '#5A6358' }}>
                              Qty: {service.quantity}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="services-empty" style={{ textAlign: 'center', padding: '2rem', color: '#5A6358' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <p>Your active services will appear here once your subscription is set up.</p>
                  </div>
                )}
              </div>
              <div className="settings-card-footer">
                <p className="footer-note">Want to add or change services? <Link href={viewingAs ? `/recommendations?viewingAs=${viewingAs}` : '/recommendations'}>View recommendations</Link> or contact your account manager.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Billing Tab */}
        <div className={`settings-tab-content ${activeTab === 'billing' ? 'active' : ''}`} id="billing-tab">
          <div className="settings-layout">
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Payment Method</h2>
                <p>Your card on file for recurring payments</p>
              </div>
              <div className="settings-card-body">
                {subscriptionLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ width: 32, height: 32 }}></div>
                  </div>
                ) : subscriptionData?.paymentMethods && subscriptionData.paymentMethods.length > 0 ? (
                  <div className="payment-methods-list">
                    {subscriptionData.paymentMethods.map((pm) => (
                      <div key={pm.id} className="payment-method-item" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        backgroundColor: pm.isDefault ? '#F5F8F5' : 'transparent',
                        borderRadius: '8px',
                        border: pm.isDefault ? '1px solid #2E7D32' : '1px solid #E8EDE6',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '32px',
                          backgroundColor: '#fff',
                          border: '1px solid #E8EDE6',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          color: '#5A6358'
                        }}>
                          {pm.brand}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, color: '#1A1F18' }}>
                            •••• •••• •••• {pm.last4}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#5A6358' }}>
                            Expires {pm.expMonth.toString().padStart(2, '0')}/{pm.expYear.toString().slice(-2)}
                          </div>
                        </div>
                        {pm.isDefault && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#2E7D32',
                            fontWeight: 500,
                            backgroundColor: '#E8F5E9',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="services-empty" style={{ textAlign: 'center', padding: '2rem', color: '#5A6358' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    <p>No payment method on file yet.</p>
                  </div>
                )}
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  {subscriptionData?.paymentMethods?.length ? 'Update Payment Method' : 'Add Payment Method'}
                </button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Billing Information</h2>
                <p>Your billing address for invoices</p>
              </div>
              <div className="settings-card-body">
                <div className="form-group">
                  <label className="form-label">Billing Email</label>
                  <input type="email" className="form-input" defaultValue={subscriptionData?.billingEmail || client.contactEmail || ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-input" defaultValue={subscriptionData?.clientName || client.name} />
                </div>
                <div className="form-group">
                  <label className="form-label">Billing Address</label>
                  <input type="text" className="form-input" placeholder="Street address" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-input" placeholder="City" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" className="form-input" placeholder="TX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP Code</label>
                    <input type="text" className="form-input" placeholder="ZIP" />
                  </div>
                </div>
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-primary">Save Changes</button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Invoice History</h2>
                <p>View and download past invoices</p>
              </div>
              <div className="settings-card-body">
                {subscriptionLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ width: 32, height: 32 }}></div>
                  </div>
                ) : subscriptionData?.invoices && subscriptionData.invoices.length > 0 ? (
                  <div className="invoice-list">
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr auto',
                      gap: '1rem',
                      padding: '0.75rem 0',
                      borderBottom: '2px solid #E8EDE6',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#5A6358',
                      textTransform: 'uppercase'
                    }}>
                      <div>Invoice</div>
                      <div>Date</div>
                      <div>Amount</div>
                      <div></div>
                    </div>
                    {subscriptionData.invoices.map((invoice) => (
                      <div key={invoice.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: '1rem',
                        padding: '1rem 0',
                        borderBottom: '1px solid #E8EDE6',
                        alignItems: 'center'
                      }}>
                        <div style={{ fontWeight: 500, color: '#1A1F18' }}>
                          {invoice.number || invoice.id.slice(0, 8)}
                        </div>
                        <div style={{ color: '#5A6358' }}>
                          {new Date(invoice.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div style={{ fontWeight: 500, color: '#1A1F18' }}>
                          ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div>
                          {invoice.pdfUrl ? (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.875rem',
                                color: '#324438',
                                textDecoration: 'none'
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                              PDF
                            </a>
                          ) : (
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: invoice.status === 'paid' ? '#E8F5E9' : '#FFF3E0',
                              color: invoice.status === 'paid' ? '#2E7D32' : '#E65100',
                              borderRadius: '4px',
                              textTransform: 'capitalize'
                            }}>
                              {invoice.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="services-empty" style={{ textAlign: 'center', padding: '2rem', color: '#5A6358' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <p>No invoices yet. Your billing history will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security Tab */}
        <div className={`settings-tab-content ${activeTab === 'security' ? 'active' : ''}`} id="security-tab">
          <div className="settings-layout">
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Change Password</h2>
                <p>Update your account password</p>
              </div>
              <div className="settings-card-body">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div className="password-input-wrapper">
                    <input type="password" className="form-input" placeholder="Enter current password" />
                    <button type="button" className="password-toggle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="password-input-wrapper">
                    <input type="password" className="form-input" placeholder="Enter new password" />
                    <button type="button" className="password-toggle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                  <p className="form-hint">Must be at least 8 characters with a mix of letters, numbers, and symbols</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input type="password" className="form-input" placeholder="Confirm new password" />
                    <button type="button" className="password-toggle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-primary">Update Password</button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Two-Factor Authentication</h2>
                <p>Add an extra layer of security to your account</p>
              </div>
              <div className="settings-card-body">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <h4>Enable 2FA</h4>
                    <p>Require a verification code when signing in</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Active Sessions</h2>
                <p>Manage devices where you&apos;re currently logged in</p>
              </div>
              <div className="settings-card-body">
                <div className="session-row">
                  <div className="session-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <div>
                      <h4>Current Browser</h4>
                      <p>Active now</p>
                    </div>
                  </div>
                  <span className="session-badge current">This device</span>
                </div>
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-secondary danger-outline">Sign Out All Other Sessions</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
