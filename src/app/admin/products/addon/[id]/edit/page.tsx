'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

// Mock add-on data - in real app this would come from API
const mockAddons: Record<string, {
  name: string
  description: string
  price: string
  status: string
  stripeProductId: string
  stripePriceId: string
}> = {
  '1': {
    name: 'Monthly Report',
    description: 'Comprehensive monthly performance report with insights and recommendations.',
    price: '99',
    status: 'active',
    stripeProductId: 'prod_MonthlyReport123',
    stripePriceId: 'price_report_99',
  },
  '2': {
    name: 'GBP Posting',
    description: 'Regular Google Business Profile posts to keep your listing active and engaging.',
    price: '99',
    status: 'active',
    stripeProductId: 'prod_GBPPosting123',
    stripePriceId: 'price_gbp_99',
  },
  '3': {
    name: 'Review Management',
    description: 'Monitor and respond to customer reviews across platforms.',
    price: '99',
    status: 'active',
    stripeProductId: 'prod_ReviewMgmt123',
    stripePriceId: 'price_review_99',
  },
  '4': {
    name: 'WordPress Care Plan',
    description: 'Secure, updated hosting and maintenance for WordPress sites.',
    price: '49',
    status: 'active',
    stripeProductId: 'prod_WPCare123',
    stripePriceId: 'price_wpcare_49',
  },
  '5': {
    name: 'AI Visibility Monitoring',
    description: 'Track your AI citation performance and visibility in AI assistants.',
    price: '149',
    status: 'active',
    stripeProductId: 'prod_AIVisibility123',
    stripePriceId: 'price_ai_149',
  },
  '6': {
    name: 'Call Tracking',
    description: 'Track and record inbound calls with detailed analytics.',
    price: '79',
    status: 'draft',
    stripeProductId: 'prod_CallTrack123',
    stripePriceId: 'price_call_79',
  },
}

export default function EditAddonPage() {
  const router = useRouter()
  const params = useParams()
  const addonId = params.id as string

  const [addonForm, setAddonForm] = useState({
    name: '',
    description: '',
    price: '',
    status: 'active',
    stripeProductId: '',
    stripePriceId: '',
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading add-on data
    const addon = mockAddons[addonId]
    if (addon) {
      setAddonForm(addon)
    }
    setIsLoading(false)
  }, [addonId])

  const handleSave = () => {
    console.log('Updating add-on:', addonId, addonForm)
    router.push('/admin/products')
  }

  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Product Management"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
        />
        <div className="admin-content">
          <div className="content-page-header">
            <p>Loading...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Product Management"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Back Link and Title */}
        <div className="content-page-header">
          <Link href="/admin/products" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Products
          </Link>
          <h1 className="content-page-title">Edit Add-On</h1>
        </div>

        {/* Form Content */}
        <div className="content-form">
          <div className="form-grid">
            {/* Main Content */}
            <div className="form-main">
              <div className="form-card">
                <h3 className="form-card-title">Add-On Information</h3>
                <div className="form-group">
                  <label htmlFor="addonName">Add-On Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="addonName"
                    className="form-control"
                    placeholder="e.g., Monthly Report"
                    value={addonForm.name}
                    onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="addonDesc">Description</label>
                  <textarea
                    id="addonDesc"
                    className="form-control"
                    rows={4}
                    placeholder="Describe what this add-on includes"
                    value={addonForm.description}
                    onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Pricing</h3>
                <div className="form-group">
                  <label htmlFor="addonPrice">Monthly Price</label>
                  <div className="input-with-addon">
                    <span className="input-addon">$</span>
                    <input
                      type="number"
                      id="addonPrice"
                      className="form-control"
                      placeholder="0.00"
                      value={addonForm.price}
                      onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                    />
                    <span className="input-addon-right">/mo</span>
                  </div>
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">Stripe Configuration</h3>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="stripeProductId">Product ID</label>
                    <input
                      type="text"
                      id="stripeProductId"
                      className="form-control"
                      placeholder="prod_xxxxxxxxxxxxx"
                      value={addonForm.stripeProductId}
                      onChange={(e) => setAddonForm({ ...addonForm, stripeProductId: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="stripePriceId">Price ID</label>
                    <input
                      type="text"
                      id="stripePriceId"
                      className="form-control"
                      placeholder="price_xxxxxxxxxxxxx"
                      value={addonForm.stripePriceId}
                      onChange={(e) => setAddonForm({ ...addonForm, stripePriceId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="form-sidebar">
              <div className="form-card">
                <h3 className="form-card-title">Settings</h3>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    className="form-control"
                    value={addonForm.status}
                    onChange={(e) => setAddonForm({ ...addonForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-actions-sidebar">
                <button className="btn btn-primary btn-block" onClick={handleSave}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Update Add-On
                </button>
                <Link href="/admin/products" className="btn btn-secondary btn-block">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
