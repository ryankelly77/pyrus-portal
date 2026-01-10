'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

type AdminRole = 'super_admin' | 'admin' | 'production_team' | 'sales'
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
  clientId: string
  clientName: string
  phone: string
  email: string
  status: UserStatus
}

interface ClientOption {
  id: string
  name: string
}

export default function AdminUsersPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'invited'>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteUserModal, setShowInviteUserModal] = useState(false)
  const [showInviteAdminModal, setShowInviteAdminModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

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

  // Fetch users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          setAdminUsers(data.adminUsers || [])
          setClientUsers(data.clientUsers || [])
          setClients(data.clients || [])
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

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
  }, [adminUsers, statusFilter, searchQuery])

  const filteredClientUsers = useMemo(() => {
    return clientUsers.filter((user) => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false
      if (clientFilter !== 'all' && user.clientId !== clientFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !user.name.toLowerCase().includes(query) &&
          !user.email.toLowerCase().includes(query) &&
          !user.clientName.toLowerCase().includes(query) &&
          !(user.phone && user.phone.includes(query))
        ) {
          return false
        }
      }
      return true
    })
  }, [clientUsers, statusFilter, clientFilter, searchQuery])

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
      case 'admin':
        return {
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          ),
          label: 'Admin',
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
      default:
        return {
          icon: null,
          label: role || 'User',
          className: '',
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

  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Users"
          user={{ name: 'Loading...', initials: '...' }}
          hasNotifications={false}
        />
        <div className="admin-content">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading users...
          </div>
        </div>
      </>
    )
  }

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
              <option key={client.id} value={client.id}>
                {client.name}
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
            Admin Users ({filteredAdminUsers.length})
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
                {filteredAdminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No admin users found
                    </td>
                  </tr>
                ) : (
                  filteredAdminUsers.map((user) => {
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
                  })
                )}
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
            Client Users ({filteredClientUsers.length})
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No client users found
                    </td>
                  </tr>
                ) : (
                  filteredClientUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="user-name">
                        <div className="user-avatar" style={{ background: user.avatarColor }}>
                          {user.initials}
                        </div>
                        <span>{user.name}</span>
                      </td>
                      <td>
                        <Link href={`/admin/clients/${user.clientId}`} style={{ color: 'var(--pyrus-brown)', textDecoration: 'none' }}>
                          {user.clientName}
                        </Link>
                      </td>
                      <td>{user.phone || '-'}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-badge status-${user.status}`}>
                          {user.status === 'registered' ? 'Registered' : 'Invited'}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/admin/clients/${user.clientId}`}
                          className="btn btn-sm btn-outline"
                        >
                          View Client
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="table-pagination">
          <span className="pagination-info">Showing {totalUsers} user{totalUsers !== 1 ? 's' : ''}</span>
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
                    <option key={client.id} value={client.id}>
                      {client.name}
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
