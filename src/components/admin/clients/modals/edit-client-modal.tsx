'use client'

import { useState, useEffect } from 'react'
import {
  type ClientPageDBClient,
  type PaymentMethod,
  AVATAR_COLORS,
} from '@/types'

// ============================================================================
// TYPES
// ============================================================================

interface EditClientModalProps {
  isOpen: boolean
  onClose: () => void
  client: ClientPageDBClient
  clientId: string
  approvedContentCount: number
  onSave: () => Promise<void>
}

type ModalTab = 'general' | 'integrations' | 'billing' | 'notifications'

interface EditFormData {
  companyName: string
  status: 'active' | 'paused' | 'onboarding' | 'test' | 'prospect'
  primaryContact: string
  email: string
  phone: string
  growthStage: 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting'
  internalNotes: string
  referredBy: string
  referralSource: string
  avatarColor: string
  // Website
  websiteUrl: string
  hostingType: '' | 'ai_site' | 'pyrus_hosted' | 'client_hosted'
  hostingProvider: string
  websiteProvider: '' | 'pear' | 'pyrus' | 'other'
  websiteLaunchDate: string
  uptimerobotMonitorId: string
  // Integrations
  agencyDashboardShareKey: string
  basecampProjectId: string
  stripeCustomerId: string
  // Billing
  billingEmail: string
  paymentMethod: string
  billingCycle: 'monthly' | 'quarterly' | 'annually'
  // Notifications
  monthlyReports: boolean
  resultAlerts: boolean
  recommendationUpdates: boolean
  weeklyDigest: boolean
  // Content approval workflow
  contentApprovalMode: 'full_approval' | 'initial_approval' | 'auto'
  approvalThreshold: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditClientModal({
  isOpen,
  onClose,
  client,
  clientId,
  approvedContentCount,
  onSave,
}: EditClientModalProps) {
  // Modal tab state
  const [activeTab, setActiveTab] = useState<ModalTab>('general')

  // Form state
  const [formData, setFormData] = useState<EditFormData>({
    companyName: '',
    status: 'active',
    primaryContact: '',
    email: '',
    phone: '',
    growthStage: 'prospect',
    internalNotes: '',
    referredBy: '',
    referralSource: '',
    avatarColor: '#885430',
    websiteUrl: '',
    hostingType: '',
    hostingProvider: '',
    websiteProvider: '',
    websiteLaunchDate: '',
    uptimerobotMonitorId: '',
    agencyDashboardShareKey: '',
    basecampProjectId: '',
    stripeCustomerId: '',
    billingEmail: '',
    paymentMethod: '',
    billingCycle: 'monthly',
    monthlyReports: true,
    resultAlerts: true,
    recommendationUpdates: true,
    weeklyDigest: false,
    contentApprovalMode: 'full_approval',
    approvalThreshold: 3,
  })

  // Saving state
  const [isSaving, setIsSaving] = useState(false)

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false)
  const [stripeBillingEmail, setStripeBillingEmail] = useState<string | null>(null)

  // Approval mode confirmation
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false)
  const [originalApprovalMode, setOriginalApprovalMode] = useState<'full_approval' | 'initial_approval' | 'auto'>('full_approval')

  // Initialize form data when client changes or modal opens
  useEffect(() => {
    if (isOpen && client) {
      const initialApprovalMode = (client.content_approval_mode as 'full_approval' | 'initial_approval' | 'auto') || 'full_approval'
      setFormData({
        companyName: client.name,
        status: (client.status as 'active' | 'paused' | 'onboarding' | 'test' | 'prospect') || 'active',
        primaryContact: client.contact_name || '',
        email: client.contact_email || '',
        phone: '',
        growthStage: (client.growth_stage as 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting') || 'prospect',
        internalNotes: client.notes || '',
        referredBy: client.referred_by || '',
        referralSource: client.referral_source || '',
        avatarColor: client.avatar_color || '#885430',
        websiteUrl: client.website_url || '',
        hostingType: (client.hosting_type as '' | 'ai_site' | 'pyrus_hosted' | 'client_hosted') || '',
        hostingProvider: client.hosting_provider || '',
        websiteProvider: (client.website_provider as '' | 'pear' | 'pyrus' | 'other') || '',
        websiteLaunchDate: client.website_launch_date ? new Date(client.website_launch_date).toISOString().split('T')[0] : '',
        uptimerobotMonitorId: client.uptimerobot_monitor_id || '',
        agencyDashboardShareKey: client.agency_dashboard_share_key || '',
        basecampProjectId: client.basecamp_project_id || '',
        stripeCustomerId: client.stripe_customer_id || '',
        billingEmail: '',
        paymentMethod: '',
        billingCycle: 'monthly',
        monthlyReports: true,
        resultAlerts: true,
        recommendationUpdates: true,
        weeklyDigest: false,
        contentApprovalMode: initialApprovalMode,
        approvalThreshold: client.approval_threshold || 3,
      })
      setOriginalApprovalMode(initialApprovalMode)
      setActiveTab('general')
    }
  }, [isOpen, client])

  // Fetch payment methods when modal opens
  useEffect(() => {
    if (isOpen && client?.stripe_customer_id) {
      fetchPaymentMethods()
    }
  }, [isOpen, client?.stripe_customer_id])

  const fetchPaymentMethods = async () => {
    if (!client?.stripe_customer_id) return
    setPaymentMethodsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/payment-methods`)
      if (res.ok) {
        const data = await res.json()
        setPaymentMethods(data.paymentMethods || [])
        if (data.billingEmail) {
          setStripeBillingEmail(data.billingEmail)
          setFormData(prev => ({ ...prev, billingEmail: data.billingEmail }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    } finally {
      setPaymentMethodsLoading(false)
    }
  }

  const handleSave = async (skipConfirmation = false) => {
    // Check if approval mode changed and show confirmation if needed
    const modeChanged = formData.contentApprovalMode !== originalApprovalMode
    if (modeChanged && !skipConfirmation) {
      setShowApprovalConfirm(true)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.companyName,
          contactName: formData.primaryContact,
          contactEmail: formData.email,
          status: formData.status,
          growthStage: formData.growthStage,
          notes: formData.internalNotes,
          referredBy: formData.referredBy,
          referralSource: formData.referralSource,
          avatarColor: formData.avatarColor,
          // Website fields
          websiteUrl: formData.websiteUrl,
          hostingType: formData.hostingType || null,
          hostingProvider: formData.hostingProvider || null,
          websiteProvider: formData.websiteProvider || null,
          websiteLaunchDate: formData.websiteLaunchDate || null,
          uptimerobotMonitorId: formData.uptimerobotMonitorId || null,
          // Integration fields
          agencyDashboardShareKey: formData.agencyDashboardShareKey,
          basecampProjectId: formData.basecampProjectId,
          stripeCustomerId: formData.stripeCustomerId,
          // Content approval workflow
          contentApprovalMode: formData.contentApprovalMode,
          approvalThreshold: formData.contentApprovalMode === 'initial_approval' ? formData.approvalThreshold : null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to update client')
      }

      setOriginalApprovalMode(formData.contentApprovalMode)
      setShowApprovalConfirm(false)
      await onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save client:', error)
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Main Edit Modal */}
      <div className="edit-modal-overlay" onClick={onClose}>
        <div className="edit-modal-content edit-modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-left">
              <div className="modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <div>
                <h2>Edit Client</h2>
                <p className="modal-subtitle">Update client information and settings</p>
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="modal-tabs">
            <button
              className={`modal-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              className={`modal-tab ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              Integrations
            </button>
            <button
              className={`modal-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              Billing
            </button>
            <button
              className={`modal-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              Notifications
            </button>
          </div>

          <div className="modal-body">
            {/* General Tab */}
            {activeTab === 'general' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="companyName">Company Name</label>
                    <input
                      type="text"
                      id="companyName"
                      className="form-control"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'paused' | 'onboarding' | 'test' | 'prospect' })}
                    >
                      <option value="active">Active</option>
                      <option value="prospect">Prospect</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="paused">Paused</option>
                      <option value="test">Test</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="primaryContact">Primary Contact Name</label>
                    <input
                      type="text"
                      id="primaryContact"
                      className="form-control"
                      value={formData.primaryContact}
                      onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="websiteUrl">Website</label>
                    <input
                      type="url"
                      id="websiteUrl"
                      className="form-control"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Growth Stage</label>
                  <div className="growth-stage-options">
                    {(['seedling', 'sprouting', 'blooming', 'harvesting'] as const).map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        className={`growth-stage-btn ${formData.growthStage === stage ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, growthStage: stage })}
                      >
                        {stage.charAt(0).toUpperCase() + stage.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Avatar Color</label>
                  <div className="color-picker-grid">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`color-picker-option ${formData.avatarColor === color.value ? 'selected' : ''}`}
                        style={{ background: color.value }}
                        onClick={() => setFormData({ ...formData, avatarColor: color.value })}
                        title={color.name}
                      >
                        {formData.avatarColor === color.value && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="internalNotes">Internal Notes</label>
                  <textarea
                    id="internalNotes"
                    className="form-control"
                    rows={4}
                    value={formData.internalNotes}
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="referredBy">Referred By</label>
                    <input
                      type="text"
                      id="referredBy"
                      className="form-control"
                      value={formData.referredBy}
                      onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                      placeholder="Name of referrer"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="referralSource">Referral Source</label>
                    <select
                      id="referralSource"
                      className="form-control"
                      value={formData.referralSource}
                      onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                    >
                      <option value="">Select source...</option>
                      <option value="client">Existing Client</option>
                      <option value="partner">Partner</option>
                      <option value="employee">Employee</option>
                      <option value="website">Website</option>
                      <option value="social">Social Media</option>
                      <option value="event">Event</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Content Approval Workflow Settings */}
                <ContentApprovalSection
                  formData={formData}
                  setFormData={setFormData}
                  approvedContentCount={approvedContentCount}
                />
              </>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <IntegrationsTab
                formData={formData}
                setFormData={setFormData}
              />
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <BillingTab
                formData={formData}
                setFormData={setFormData}
                client={client}
                paymentMethods={paymentMethods}
                paymentMethodsLoading={paymentMethodsLoading}
                stripeBillingEmail={stripeBillingEmail}
              />
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <NotificationsTab
                formData={formData}
                setFormData={setFormData}
              />
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => handleSave()} disabled={isSaving}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Approval Mode Change Confirmation Modal */}
      {showApprovalConfirm && (
        <div className="modal-overlay active" onClick={() => setShowApprovalConfirm(false)} style={{ zIndex: 1001 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <div>
                  <h2 className="modal-title">Change approval workflow?</h2>
                  <p className="modal-subtitle">For {client?.name || 'this client'}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowApprovalConfirm(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
                You&apos;re changing from <strong style={{ color: '#1F2937' }}>
                  {originalApprovalMode === 'full_approval' ? 'Full Approval' :
                   originalApprovalMode === 'initial_approval' ? 'Initial Approval' : 'Auto / No Review'}
                </strong> to <strong style={{ color: '#1F2937' }}>
                  {formData.contentApprovalMode === 'full_approval' ? 'Full Approval' :
                   formData.contentApprovalMode === 'initial_approval' ? 'Initial Approval' : 'Auto / No Review'}
                </strong>.
              </p>
              <p style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                This will affect how new content is handled. Content already in progress will not be changed.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowApprovalConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                style={{ background: '#D97706', borderColor: '#D97706' }}
              >
                {isSaving ? 'Saving...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ContentApprovalSectionProps {
  formData: EditFormData
  setFormData: React.Dispatch<React.SetStateAction<EditFormData>>
  approvedContentCount: number
}

function ContentApprovalSection({ formData, setFormData, approvedContentCount }: ContentApprovalSectionProps) {
  return (
    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" width="20" height="20">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <polyline points="16 13 12 17 8 13"></polyline>
          <line x1="12" y1="17" x2="12" y2="9"></line>
        </svg>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1F2937', margin: 0 }}>Content Approval Workflow</h4>
      </div>
      <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
        How should content be reviewed for this client?
      </p>

      {/* Progress Bar - shown when initial_approval mode is active */}
      {formData.contentApprovalMode === 'initial_approval' && (
        <div style={{
          background: approvedContentCount >= formData.approvalThreshold ? '#ECFDF5' : '#FFFBEB',
          border: `1px solid ${approvedContentCount >= formData.approvalThreshold ? '#A7F3D0' : '#FDE68A'}`,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          {approvedContentCount >= formData.approvalThreshold ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#22C55E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="18" height="18">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.9rem' }}>
                  Threshold Reached
                </div>
                <div style={{ color: '#047857', fontSize: '0.8rem' }}>
                  {approvedContentCount} pieces approved — new content will auto-approve
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="18" height="18">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  <span style={{ fontWeight: 600, color: '#92400E', fontSize: '0.9rem' }}>
                    Initial Approval Progress
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: '#D97706', fontSize: '0.9rem' }}>
                  {approvedContentCount} / {formData.approvalThreshold}
                </span>
              </div>
              <div style={{ height: '8px', background: '#FDE68A', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min((approvedContentCount / formData.approvalThreshold) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ color: '#92400E', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {formData.approvalThreshold - approvedContentCount} more piece{formData.approvalThreshold - approvedContentCount !== 1 ? 's' : ''} until auto-approval activates
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Full Approval Option */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '8px',
            border: formData.contentApprovalMode === 'full_approval' ? '2px solid #14B8A6' : '1px solid #E5E7EB',
            background: formData.contentApprovalMode === 'full_approval' ? '#F0FDFA' : 'white',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="radio"
            name="approvalMode"
            checked={formData.contentApprovalMode === 'full_approval'}
            onChange={() => setFormData({ ...formData, contentApprovalMode: 'full_approval' })}
            style={{ marginTop: '3px' }}
          />
          <div>
            <div style={{ fontWeight: 500, color: '#1F2937', marginBottom: '0.25rem' }}>Full Approval</div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Client reviews and approves every piece of content before it goes to production.
            </div>
          </div>
        </label>

        {/* Initial Approval Option */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '8px',
            border: formData.contentApprovalMode === 'initial_approval' ? '2px solid #F59E0B' : '1px solid #E5E7EB',
            background: formData.contentApprovalMode === 'initial_approval' ? '#FFFBEB' : 'white',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="radio"
            name="approvalMode"
            checked={formData.contentApprovalMode === 'initial_approval'}
            onChange={() => setFormData({ ...formData, contentApprovalMode: 'initial_approval' })}
            style={{ marginTop: '3px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, color: '#1F2937', marginBottom: '0.25rem' }}>Initial Approval</div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>
              Client reviews the first{' '}
              <input
                type="number"
                min={1}
                max={20}
                value={formData.approvalThreshold}
                onChange={(e) => setFormData({ ...formData, approvalThreshold: parseInt(e.target.value) || 3 })}
                onClick={(e) => e.stopPropagation()}
                disabled={formData.contentApprovalMode !== 'initial_approval'}
                style={{
                  width: '50px',
                  padding: '2px 6px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  margin: '0 4px',
                  background: formData.contentApprovalMode === 'initial_approval' ? 'white' : '#F3F4F6',
                }}
              />
              {' '}pieces, then content moves to production automatically.
            </div>

            {/* Progress indicator */}
            {formData.contentApprovalMode === 'initial_approval' && (
              <div style={{
                background: '#F9FAFB',
                borderRadius: '6px',
                padding: '0.75rem',
                marginTop: '0.5rem',
              }}>
                {approvedContentCount >= formData.approvalThreshold ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.875rem', fontWeight: 500 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Threshold reached — new content auto-approves
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                      <span>{approvedContentCount} of {formData.approvalThreshold} approved so far</span>
                      <span>{Math.round((approvedContentCount / formData.approvalThreshold) * 100)}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min((approvedContentCount / formData.approvalThreshold) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </label>

        {/* Auto Option */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '8px',
            border: formData.contentApprovalMode === 'auto' ? '2px solid #22C55E' : '1px solid #E5E7EB',
            background: formData.contentApprovalMode === 'auto' ? '#F0FDF4' : 'white',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="radio"
            name="approvalMode"
            checked={formData.contentApprovalMode === 'auto'}
            onChange={() => setFormData({ ...formData, contentApprovalMode: 'auto' })}
            style={{ marginTop: '3px' }}
          />
          <div>
            <div style={{ fontWeight: 500, color: '#1F2937', marginBottom: '0.25rem' }}>Auto / No Review</div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Content moves directly to production without client review. Best for clients who trust the process.
            </div>
            {formData.contentApprovalMode === 'auto' && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: '#ECFDF5',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#065F46',
              }}>
                <strong>Workflow:</strong> Draft → Internal Review → Final Optimization → Image Selection → Published
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  )
}

interface IntegrationsTabProps {
  formData: EditFormData
  setFormData: React.Dispatch<React.SetStateAction<EditFormData>>
}

function IntegrationsTab({ formData, setFormData }: IntegrationsTabProps) {
  return (
    <>
      <p className="form-section-desc" style={{ marginBottom: '1.5rem', color: '#6B7280' }}>
        Connect external services to enable features like Results dashboard and Activity feed.
      </p>

      <div className="form-group">
        <label htmlFor="agencyDashboardShareKey">Agency Dashboard Share Key</label>
        <input
          type="text"
          id="agencyDashboardShareKey"
          className="form-control"
          placeholder="e.g., MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM="
          value={formData.agencyDashboardShareKey}
          onChange={(e) => setFormData({ ...formData, agencyDashboardShareKey: e.target.value })}
        />
        <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
          From agencydashboard.io campaign share link. Enables the Results tab.
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="basecampProjectId">Basecamp Project ID</label>
        <input
          type="text"
          id="basecampProjectId"
          className="form-control"
          placeholder="e.g., 43126663"
          value={formData.basecampProjectId}
          onChange={(e) => setFormData({ ...formData, basecampProjectId: e.target.value })}
        />
        <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
          From URL: 3.basecamp.com/5202430/projects/<strong>[this number]</strong>. Enables Activity tab.
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="stripeCustomerId">Stripe Customer ID</label>
        <input
          type="text"
          id="stripeCustomerId"
          className="form-control"
          placeholder="e.g., cus_ABC123..."
          value={formData.stripeCustomerId}
          onChange={(e) => setFormData({ ...formData, stripeCustomerId: e.target.value })}
        />
        <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
          Links invoices and billing from Stripe. Find in Stripe Dashboard → Customers.
        </small>
      </div>

      {/* Website Section */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '1rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>Website</h4>

        <div className="form-group">
          <label htmlFor="integWebsiteUrl">Website Address</label>
          <input
            type="url"
            id="integWebsiteUrl"
            className="form-control"
            placeholder="e.g., https://example.com"
            value={formData.websiteUrl}
            onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="websiteProvider">Built By</label>
          <select
            id="websiteProvider"
            className="form-control"
            value={formData.websiteProvider}
            onChange={(e) => setFormData({ ...formData, websiteProvider: e.target.value as '' | 'pear' | 'pyrus' | 'other' })}
          >
            <option value="">Select...</option>
            <option value="pear">Pear Analytics</option>
            <option value="pyrus">Pyrus Digital</option>
            <option value="other">Other / Client-managed</option>
          </select>
          <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
            Who built or maintains this website
          </small>
        </div>

        <div className="form-group">
          <label>Hosting Type</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="radio"
                name="hostingType"
                value="ai_site"
                checked={formData.hostingType === 'ai_site'}
                onChange={() => setFormData({ ...formData, hostingType: 'ai_site', hostingProvider: '' })}
              />
              <span>AI Site (Landingsite.ai)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="radio"
                name="hostingType"
                value="pyrus_hosted"
                checked={formData.hostingType === 'pyrus_hosted'}
                onChange={() => setFormData({ ...formData, hostingType: 'pyrus_hosted', hostingProvider: '' })}
              />
              <span>Pyrus Hosted (WordPress)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="radio"
                name="hostingType"
                value="client_hosted"
                checked={formData.hostingType === 'client_hosted'}
                onChange={() => setFormData({ ...formData, hostingType: 'client_hosted' })}
              />
              <span>Client Hosted</span>
            </label>
          </div>
        </div>

        {formData.hostingType === 'client_hosted' && (
          <div className="form-group">
            <label htmlFor="hostingProvider">Hosting Provider</label>
            <input
              type="text"
              id="hostingProvider"
              className="form-control"
              placeholder="e.g., HubSpot, Wix, Squarespace, GoDaddy"
              value={formData.hostingProvider}
              onChange={(e) => setFormData({ ...formData, hostingProvider: e.target.value })}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="websiteLaunchDate">Launch Date</label>
          <input
            type="date"
            id="websiteLaunchDate"
            className="form-control"
            value={formData.websiteLaunchDate}
            onChange={(e) => setFormData({ ...formData, websiteLaunchDate: e.target.value })}
          />
          <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
            Leave blank if website hasn&apos;t launched yet
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="uptimerobotMonitorId">UptimeRobot Monitor ID</label>
          <input
            type="text"
            id="uptimerobotMonitorId"
            className="form-control"
            placeholder="e.g., 123456789"
            value={formData.uptimerobotMonitorId}
            onChange={(e) => setFormData({ ...formData, uptimerobotMonitorId: e.target.value })}
          />
          <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
            Get from UptimeRobot dashboard. Leave blank to show &quot;Not Monitored&quot;
          </small>
        </div>
      </div>
    </>
  )
}

interface BillingTabProps {
  formData: EditFormData
  setFormData: React.Dispatch<React.SetStateAction<EditFormData>>
  client: ClientPageDBClient
  paymentMethods: PaymentMethod[]
  paymentMethodsLoading: boolean
  stripeBillingEmail: string | null
}

function BillingTab({ formData, setFormData, client, paymentMethods, paymentMethodsLoading, stripeBillingEmail }: BillingTabProps) {
  return (
    <>
      <div className="form-group">
        <label htmlFor="billingEmail">Billing Contact Email</label>
        <input
          type="email"
          id="billingEmail"
          className="form-control"
          value={formData.billingEmail}
          onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
          readOnly={!!stripeBillingEmail}
          style={stripeBillingEmail ? { backgroundColor: '#F9FAFB' } : {}}
        />
        {stripeBillingEmail && (
          <small style={{ color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
            From Stripe customer record.{' '}
            <a
              href={`https://dashboard.stripe.com/customers/${client?.stripe_customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563EB' }}
            >
              Edit in Stripe
            </a>
          </small>
        )}
      </div>

      <div className="form-group">
        <label>Payment Methods</label>
        {paymentMethodsLoading ? (
          <div className="payment-method-display" style={{ opacity: 0.6 }}>
            <div className="payment-method-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <span>Loading...</span>
            </div>
          </div>
        ) : !client?.stripe_customer_id ? (
          <div className="payment-method-display" style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB' }}>
            <div className="payment-method-info" style={{ color: '#6B7280' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <span>No Stripe customer linked</span>
            </div>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="payment-method-display" style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}>
            <div className="payment-method-info" style={{ color: '#92400E' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>No payment method on file</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {paymentMethods.map(pm => (
              <div key={pm.id} className="payment-method-display" style={pm.isDefault ? { borderColor: '#10B981' } : {}}>
                <div className="payment-method-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <span>
                    {pm.card ? (
                      <>
                        {pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)} •••• {pm.card.last4}
                        <span style={{ color: '#6B7280', marginLeft: '0.5rem' }}>
                          Exp {pm.card.expMonth.toString().padStart(2, '0')}/{pm.card.expYear.toString().slice(-2)}
                        </span>
                      </>
                    ) : pm.usBankAccount ? (
                      <>
                        {pm.usBankAccount.bankName} •••• {pm.usBankAccount.last4}
                        <span style={{ color: '#6B7280', marginLeft: '0.5rem' }}>
                          {pm.usBankAccount.accountType.charAt(0).toUpperCase() + pm.usBankAccount.accountType.slice(1)}
                        </span>
                      </>
                    ) : pm.link ? (
                      <>Stripe Link ({pm.link.email})</>
                    ) : (
                      pm.type
                    )}
                  </span>
                  {pm.isDefault && (
                    <span style={{
                      background: '#D1FAE5',
                      color: '#065F46',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      marginLeft: '0.5rem',
                    }}>Default</span>
                  )}
                </div>
                {client?.stripe_customer_id && (
                  <a
                    href={`https://dashboard.stripe.com/customers/${client.stripe_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="payment-update-btn"
                    style={{ textDecoration: 'none' }}
                  >
                    Manage in Stripe
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="billingCycle">Billing Cycle</label>
        <select
          id="billingCycle"
          className="form-control"
          value={formData.billingCycle}
          onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as 'monthly' | 'quarterly' | 'annually' })}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>
      </div>
    </>
  )
}

interface NotificationsTabProps {
  formData: EditFormData
  setFormData: React.Dispatch<React.SetStateAction<EditFormData>>
}

function NotificationsTab({ formData, setFormData }: NotificationsTabProps) {
  return (
    <div className="notification-toggles">
      <div className="notification-toggle-item">
        <div className="notification-toggle-info">
          <div className="notification-toggle-title">Monthly Reports</div>
          <div className="notification-toggle-desc">Send automated monthly performance reports</div>
        </div>
        <div className="edit-toggle-wrap">
          <input
            type="checkbox"
            checked={formData.monthlyReports}
            onChange={(e) => setFormData({ ...formData, monthlyReports: e.target.checked })}
          />
          <span className="edit-toggle-track"></span>
        </div>
      </div>

      <div className="notification-toggle-item">
        <div className="notification-toggle-info">
          <div className="notification-toggle-title">Result Alerts</div>
          <div className="notification-toggle-desc">Notify when significant milestones are achieved</div>
        </div>
        <div className="edit-toggle-wrap">
          <input
            type="checkbox"
            checked={formData.resultAlerts}
            onChange={(e) => setFormData({ ...formData, resultAlerts: e.target.checked })}
          />
          <span className="edit-toggle-track"></span>
        </div>
      </div>

      <div className="notification-toggle-item">
        <div className="notification-toggle-info">
          <div className="notification-toggle-title">Recommendation Updates</div>
          <div className="notification-toggle-desc">Notify when new recommendations are available</div>
        </div>
        <div className="edit-toggle-wrap">
          <input
            type="checkbox"
            checked={formData.recommendationUpdates}
            onChange={(e) => setFormData({ ...formData, recommendationUpdates: e.target.checked })}
          />
          <span className="edit-toggle-track"></span>
        </div>
      </div>

      <div className="notification-toggle-item">
        <div className="notification-toggle-info">
          <div className="notification-toggle-title">Weekly Digest</div>
          <div className="notification-toggle-desc">Send weekly summary of activity and results</div>
        </div>
        <div className="edit-toggle-wrap">
          <input
            type="checkbox"
            checked={formData.weeklyDigest}
            onChange={(e) => setFormData({ ...formData, weeklyDigest: e.target.checked })}
          />
          <span className="edit-toggle-track"></span>
        </div>
      </div>
    </div>
  )
}

export default EditClientModal
