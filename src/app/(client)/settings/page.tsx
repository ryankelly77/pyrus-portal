'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getClientByViewingAs } from '@/lib/client-data'

type SettingsTab = 'profile' | 'subscription' | 'billing' | 'security'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const client = getClientByViewingAs(viewingAs)

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  // Parse first and last name from primaryContact
  const nameParts = client.primaryContact.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

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
            <span className="user-name">{client.primaryContact}</span>
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
            className={`settings-tab ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            Subscription &amp; Services
          </button>
          <button
            className={`settings-tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            Payment &amp; Billing
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
                  <input type="email" className="form-input" defaultValue={client.email} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" defaultValue="(210) 555-1234" />
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
                <div className="subscription-overview">
                  <div className="subscription-plan">
                    <span className="plan-badge">{client.id === 'raptor-vending' ? 'Starter Plan' : 'Growth Plan'}</span>
                    <div className="plan-price">
                      <span className="price-amount">{client.id === 'raptor-vending' ? '$698' : '$1,597'}</span>
                      <span className="price-period">/month</span>
                    </div>
                  </div>
                  <div className="subscription-meta">
                    <div className="meta-item">
                      <span className="meta-label">Next Billing Date</span>
                      <span className="meta-value">January 15, 2026</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Billing Cycle</span>
                      <span className="meta-value">Monthly</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Client Since</span>
                      <span className="meta-value">{client.clientSince}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Active Services</h2>
                <p>Services included in your subscription</p>
              </div>
              <div className="settings-card-body">
                <div className="services-list-settings">
                  <div className="service-row">
                    <div className="service-info">
                      <div className="service-icon" style={{ background: '#FFF2D9', color: '#D4A72C' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                      </div>
                      <div>
                        <h4>Website Starter</h4>
                        <p>Root Service</p>
                      </div>
                    </div>
                    <span className="service-price">$199/mo</span>
                  </div>
                  <div className="service-row">
                    <div className="service-info">
                      <div className="service-icon" style={{ background: '#E6F2D9', color: '#7A9C3A' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </div>
                      <div>
                        <h4>Seedling SEO Plan</h4>
                        <p>Growth Service</p>
                      </div>
                    </div>
                    <span className="service-price">$599/mo</span>
                  </div>
                  <div className="service-row">
                    <div className="service-info">
                      <div className="service-icon" style={{ background: '#E6F2D9', color: '#7A9C3A' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                      </div>
                      <div>
                        <h4>Google Search Ads</h4>
                        <p>Growth Service</p>
                      </div>
                    </div>
                    <span className="service-price">$599/mo</span>
                  </div>
                  <div className="service-row">
                    <div className="service-info">
                      <div className="service-icon" style={{ background: '#FFE8D4', color: '#E07830' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <div>
                        <h4>CRM &amp; Lead Tracking</h4>
                        <p>Cultivation Tool</p>
                      </div>
                    </div>
                    <span className="service-price">$99/mo</span>
                  </div>
                  <div className="service-row">
                    <div className="service-info">
                      <div className="service-icon" style={{ background: '#FFE8D4', color: '#E07830' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                      </div>
                      <div>
                        <h4>Web Chat</h4>
                        <p>Cultivation Tool</p>
                      </div>
                    </div>
                    <span className="service-price">$99/mo</span>
                  </div>
                </div>
                <div className="services-total">
                  <span>Monthly Total</span>
                  <span className="total-amount">$1,597/mo</span>
                </div>
              </div>
              <div className="settings-card-footer">
                <p className="footer-note">Want to add or change services? <Link href="/recommendations">View recommendations</Link> or contact your account manager.</p>
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
                <div className="payment-card-display">
                  <div className="card-brand">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                  </div>
                  <div className="card-details">
                    <span className="card-number">Visa ending in 4242</span>
                    <span className="card-expiry">Expires 08/2027</span>
                  </div>
                  <span className="card-badge default">Default</span>
                </div>
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  Update Payment Method
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
                  <input type="email" className="form-input" defaultValue={`billing@${client.id === 'raptor-vending' ? 'raptorvending.com' : 'tc-clinicalservices.com'}`} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-input" defaultValue={client.name + ' LLC'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Billing Address</label>
                  <input type="text" className="form-input" defaultValue="1234 Medical Center Dr, Suite 100" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-input" defaultValue="San Antonio" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" className="form-input" defaultValue="TX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP Code</label>
                    <input type="text" className="form-input" defaultValue="78229" />
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
                <table className="invoices-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="invoice-id">INV-2025-0012</td>
                      <td>Dec 15, 2025</td>
                      <td>$1,597.00</td>
                      <td><span className="invoice-status paid">Paid</span></td>
                      <td>
                        <button className="btn-text">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="invoice-id">INV-2025-0011</td>
                      <td>Nov 15, 2025</td>
                      <td>$1,597.00</td>
                      <td><span className="invoice-status paid">Paid</span></td>
                      <td>
                        <button className="btn-text">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="invoice-id">INV-2025-0010</td>
                      <td>Oct 15, 2025</td>
                      <td>$1,597.00</td>
                      <td><span className="invoice-status paid">Paid</span></td>
                      <td>
                        <button className="btn-text">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="invoice-id">INV-2025-0009</td>
                      <td>Sep 15, 2025</td>
                      <td>$1,597.00</td>
                      <td><span className="invoice-status paid">Paid</span></td>
                      <td>
                        <button className="btn-text">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-secondary">View All Invoices</button>
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
                      <h4>Chrome on macOS</h4>
                      <p>San Antonio, TX - Current session</p>
                    </div>
                  </div>
                  <span className="session-badge current">This device</span>
                </div>
                <div className="session-row">
                  <div className="session-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                    <div>
                      <h4>Safari on iPhone</h4>
                      <p>San Antonio, TX - Last active 2 hours ago</p>
                    </div>
                  </div>
                  <button className="btn-text danger">Sign out</button>
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
