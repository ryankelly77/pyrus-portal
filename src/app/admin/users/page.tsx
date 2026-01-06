'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

type AdminRole = 'super_admin' | 'production_team' | 'sales'
type UserStatus = 'registered' | 'invited'

interface AdminUser {
  id: string
  name: string
  initials: string
  avatarColor: string
  role: AdminRole
  email: string
  status: UserStatus
  isOwner?: boolean
}

interface ClientUser {
  id: string
  name: string
  initials: string
  avatarColor: string
  client: string
  phone: string
  email: string
  status: UserStatus
  recommendationType: 'smart' | 'original'
}

const adminUsers: AdminUser[] = [
  {
    id: 'a1',
    name: 'Ryan Kelly',
    initials: 'RK',
    avatarColor: 'linear-gradient(135deg, var(--pyrus-green) 0%, var(--pyrus-green-light) 100%)',
    role: 'super_admin',
    email: 'ryan@pyrusdigital.com',
    status: 'registered',
    isOwner: true,
  },
  {
    id: 'a2',
    name: 'Sarah Mitchell',
    initials: 'SM',
    avatarColor: '#3B82F6',
    role: 'production_team',
    email: 'sarah@pyrusdigital.com',
    status: 'registered',
  },
  {
    id: 'a3',
    name: 'James Davis',
    initials: 'JD',
    avatarColor: '#6B7280',
    role: 'production_team',
    email: 'james@pyrusdigital.com',
    status: 'invited',
  },
  {
    id: 'a4',
    name: 'Emily Chen',
    initials: 'EC',
    avatarColor: '#8B5CF6',
    role: 'sales',
    email: 'emily@pyrusdigital.com',
    status: 'registered',
  },
]

const clientUsers: ClientUser[] = [
  {
    id: 'c1',
    name: 'Jon De La Garza',
    initials: 'TC',
    avatarColor: 'linear-gradient(135deg, #B57841 0%, #C4895A 100%)',
    client: 'TC Clinical Services',
    phone: '(555) 123-4567',
    email: 'dlg.mdservices@gmail.com',
    status: 'registered',
    recommendationType: 'smart',
  },
  {
    id: 'c2',
    name: 'Mike Johnson',
    initials: 'MJ',
    avatarColor: '#2563EB',
    client: 'Raptor Vending',
    phone: '(555) 234-5678',
    email: 'mike@raptorvending.com',
    status: 'registered',
    recommendationType: 'smart',
  },
  {
    id: 'c3',
    name: 'Sarah Martinez',
    initials: 'SM',
    avatarColor: '#7C3AED',
    client: 'Raptor Services',
    phone: '(555) 345-6789',
    email: 'sarah@raptorservices.com',
    status: 'registered',
    recommendationType: 'smart',
  },
  {
    id: 'c4',
    name: 'Maria Espronceda',
    initials: 'ME',
    avatarColor: '#DC2626',
    client: 'Espronceda Law',
    phone: '(555) 456-7890',
    email: 'maria@espronceda.law',
    status: 'registered',
    recommendationType: 'smart',
  },
  {
    id: 'c5',
    name: 'James Wilson',
    initials: 'JW',
    avatarColor: '#3B82F6',
    client: 'Summit Dental',
    phone: '(555) 567-8901',
    email: 'james@summitdental.com',
    status: 'invited',
    recommendationType: 'original',
  },
  {
    id: 'c6',
    name: 'Lisa Brown',
    initials: 'LB',
    avatarColor: '#059669',
    client: 'Coastal Properties',
    phone: '(555) 678-9012',
    email: 'lisa@coastalproperties.com',
    status: 'invited',
    recommendationType: 'original',
  },
  {
    id: 'c7',
    name: 'Rachel Davis',
    initials: 'RD',
    avatarColor: '#3B82F6',
    client: 'Summit Dental',
    phone: '(555) 789-0123',
    email: 'rachel@summitdental.com',
    status: 'registered',
    recommendationType: 'smart',
  },
  {
    id: 'c8',
    name: 'Kevin Thompson',
    initials: 'KT',
    avatarColor: 'linear-gradient(135deg, #B57841 0%, #C4895A 100%)',
    client: 'TC Clinical Services',
    phone: '(555) 890-1234',
    email: 'kevin@tc-clinicalservices.com',
    status: 'invited',
    recommendationType: 'original',
  },
]

const clients = [
  'TC Clinical Services',
  'Raptor Vending',
  'Raptor Services',
  'Espronceda Law',
  'Summit Dental',
  'Coastal Properties',
]

export default function AdminUsersPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'invited'>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteUserModal, setShowInviteUserModal] = useState(false)
  const [showInviteAdminModal, setShowInviteAdminModal] = useState(false)

  // Invite user form state
  const [inviteUserForm, setInviteUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    client: '',
  })

  // Invite admin form state
  const [inviteAdminForm, setInviteAdminForm] = useState({
    name: '',
    email: '',
    role: 'production_team' as AdminRole,
  })

  const filteredAdminUsers = useMemo(() => {
    return adminUsers.filter((user) => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !user.name.toLowerCase().includes(query) &&
          !user.email.toLowerCase().includes(query)
        ) {
          return false
        }
      }
      return true
    })
  }, [statusFilter, searchQuery])

  const filteredClientUsers = useMemo(() => {
    return clientUsers.filter((user) => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false
      if (clientFilter !== 'all' && user.client !== clientFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !user.name.toLowerCase().includes(query) &&
          !user.email.toLowerCase().includes(query) &&
          !user.client.toLowerCase().includes(query) &&
          !user.phone.includes(query)
        ) {
          return false
        }
      }
      return true
    })
  }, [statusFilter, clientFilter, searchQuery])

  const getRoleBadgeContent = (role: AdminRole) => {
    switch (role) {
      case 'super_admin':
        return {
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          ),
          label: 'Super Admin',
          className: 'super-admin',
        }
      case 'production_team':
        return {
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          ),
          label: 'Production Team',
          className: 'production-team',
        }
      case 'sales':
        return {
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          ),
          label: 'Sales',
          className: 'sales',
        }
    }
  }

  const handleEditAdmin = (userId: string) => {
    console.log('Edit admin user:', userId)
  }

  const handleResendAdmin = (userId: string) => {
    console.log('Resend admin invite:', userId)
  }

  const handleInviteUser = () => {
    console.log('Invite user:', inviteUserForm)
    setShowInviteUserModal(false)
    setInviteUserForm({
      name: '',
      email: '',
      phone: '',
      client: '',
    })
  }

  const handleInviteAdmin = () => {
    console.log('Invite admin:', inviteAdminForm)
    setShowInviteAdminModal(false)
    setInviteAdminForm({
      name: '',
      email: '',
      role: 'production_team',
    })
  }

  const totalUsers = filteredAdminUsers.length + filteredClientUsers.length

  return (
    <>
      <AdminHeader
        title="Users"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage portal users and their access</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInviteUserModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Invite User
          </button>
        </div>

        {/* Filters */}
        <div className="clients-toolbar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Users
            </button>
            <button
              className={`filter-btn ${statusFilter === 'registered' ? 'active' : ''}`}
              onClick={() => setStatusFilter('registered')}
            >
              Registered
            </button>
            <button
              className={`filter-btn ${statusFilter === 'invited' ? 'active' : ''}`}
              onClick={() => setStatusFilter('invited')}
            >
              Invited
            </button>
          </div>
          <select
            className="sort-select"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="all">All Clients</option>
            {clients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
        </div>

        {/* Admin Users Section */}
        <div className="admin-users-section">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Admin Users
          </h3>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdminUsers.map((user) => {
                  const roleContent = getRoleBadgeContent(user.role)
                  return (
                    <tr key={user.id}>
                      <td className="user-name">
                        <div className="user-avatar" style={{ background: user.avatarColor }}>
                          {user.initials}
                        </div>
                        <span>{user.name}</span>
                      </td>
                      <td>
                        <span className={`role-badge ${roleContent.className}`}>
                          {roleContent.icon}
                          {roleContent.label}
                        </span>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-badge status-${user.status}`}>
                          {user.status === 'registered' ? 'Active' : 'Invited'}
                        </span>
                      </td>
                      <td>
                        {user.isOwner ? (
                          <span className="text-muted" style={{ fontSize: '12px' }}>Owner</span>
                        ) : user.status === 'invited' ? (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleResendAdmin(user.id)}
                          >
                            Resend
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleEditAdmin(user.id)}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => setShowInviteAdminModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Invite Admin User
          </button>
        </div>

        {/* Client Users Section */}
        <div className="client-users-section">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Client Users
          </h3>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="user-name">
                      <div className="user-avatar" style={{ background: user.avatarColor }}>
                        {user.initials}
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td>{user.client}</td>
                    <td>{user.phone}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status-badge status-${user.status}`}>
                        {user.status === 'registered' ? 'Registered' : 'Invited'}
                      </span>
                    </td>
                    <td>
                      {user.recommendationType === 'smart' ? (
                        <Link href="/client/recommendations?tab=smart" className="recommendation-link">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                          </svg>
                          Smart Recommendation
                        </Link>
                      ) : (
                        <Link href="/client/recommendations?tab=original" className="recommendation-link original">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                          Original Plan
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="table-pagination">
          <span className="pagination-info">Showing 1-{totalUsers} of {totalUsers} users</span>
          <div className="pagination-buttons">
            <button className="btn btn-sm btn-secondary" disabled>
              Previous
            </button>
            <button className="btn btn-sm btn-secondary">Next</button>
          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteUserModal && (
        <div className="modal-overlay active" onClick={() => setShowInviteUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Client User</h2>
              <button className="modal-close" onClick={() => setShowInviteUserModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Send an invitation to a client user to access their portal.</p>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter full name"
                  value={inviteUserForm.name}
                  onChange={(e) => setInviteUserForm({ ...inviteUserForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter email address"
                  value={inviteUserForm.email}
                  onChange={(e) => setInviteUserForm({ ...inviteUserForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="(555) 123-4567"
                  value={inviteUserForm.phone}
                  onChange={(e) => setInviteUserForm({ ...inviteUserForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Client Account</label>
                <select
                  className="form-control"
                  value={inviteUserForm.client}
                  onChange={(e) => setInviteUserForm({ ...inviteUserForm, client: e.target.value })}
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowInviteUserModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleInviteUser}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInviteAdminModal && (
        <div className="modal-overlay active" onClick={() => setShowInviteAdminModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Admin User</h2>
              <button className="modal-close" onClick={() => setShowInviteAdminModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Add a new team member with admin access to the portal.</p>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter full name"
                  value={inviteAdminForm.name}
                  onChange={(e) => setInviteAdminForm({ ...inviteAdminForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter email address"
                  value={inviteAdminForm.email}
                  onChange={(e) => setInviteAdminForm({ ...inviteAdminForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <div className="radio-group vertical">
                  <label className="radio-option role-super-admin">
                    <input
                      type="radio"
                      name="adminRole"
                      value="super_admin"
                      checked={inviteAdminForm.role === 'super_admin'}
                      onChange={() => setInviteAdminForm({ ...inviteAdminForm, role: 'super_admin' })}
                    />
                    <span className="radio-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      <span>
                        <strong>Super Admin</strong>
                        <small>Full access to all features and settings</small>
                      </span>
                    </span>
                  </label>
                  <label className="radio-option role-production-team">
                    <input
                      type="radio"
                      name="adminRole"
                      value="production_team"
                      checked={inviteAdminForm.role === 'production_team'}
                      onChange={() => setInviteAdminForm({ ...inviteAdminForm, role: 'production_team' })}
                    />
                    <span className="radio-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                      </svg>
                      <span>
                        <strong>Production Team</strong>
                        <small>Access to content and client management</small>
                      </span>
                    </span>
                  </label>
                  <label className="radio-option role-sales">
                    <input
                      type="radio"
                      name="adminRole"
                      value="sales"
                      checked={inviteAdminForm.role === 'sales'}
                      onChange={() => setInviteAdminForm({ ...inviteAdminForm, role: 'sales' })}
                    />
                    <span className="radio-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <span>
                        <strong>Sales</strong>
                        <small>Access to revenue and client information</small>
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowInviteAdminModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleInviteAdmin}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
