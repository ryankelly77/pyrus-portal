'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

type AdminRole = 'super_admin' | 'admin' | 'production_team' | 'sales'
type UserStatus = 'registered' | 'invited'
type Tab = 'users' | 'roles'

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

interface PendingInvite {
  id: string
  name: string
  initials: string
  avatarColor: string
  email: string
  role: string
  clientIds: string[]
  status: 'pending'
  invitedBy: string
  createdAt: string
  expiresAt: string
}

interface ClientOption {
  id: string
  name: string
}

interface MenuItem {
  key: string
  label: string
}

interface RolePermissions {
  [role: string]: {
    [menuKey: string]: boolean
  }
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'invited'>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  // Current user role (fetched from admin users)
  const [currentUserRole, setCurrentUserRole] = useState<AdminRole | null>(null)

  // Role permissions state
  const [permissions, setPermissions] = useState<RolePermissions>({})
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [savingRole, setSavingRole] = useState<string | null>(null)

  // Unified invite form state
  type InviteRole = 'client' | 'admin' | 'super_admin' | 'production_team' | 'sales'
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'client' as InviteRole,
    clientIds: [] as string[],
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
          setPendingInvites(data.pendingInvites || [])
          setClients(data.clients || [])

          // Find current user's role from their session
          if (data.currentUserRole) {
            setCurrentUserRole(data.currentUserRole)
          }
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // Fetch role permissions when roles tab is active and user is super_admin
  useEffect(() => {
    if (activeTab === 'roles' && currentUserRole === 'super_admin') {
      const fetchPermissions = async () => {
        setPermissionsLoading(true)
        try {
          const res = await fetch('/api/admin/role-permissions')
          if (res.ok) {
            const data = await res.json()
            setPermissions(data.permissions || {})
            setMenuItems(data.menuItems || [])
            setRoles(data.roles || [])
          }
        } catch (error) {
          console.error('Failed to fetch role permissions:', error)
        } finally {
          setPermissionsLoading(false)
        }
      }
      fetchPermissions()
    }
  }, [activeTab, currentUserRole])

  // Handle permission toggle
  const handlePermissionToggle = async (role: string, menuKey: string, currentValue: boolean) => {
    if (role === 'super_admin') return // Cannot modify super_admin permissions

    // Optimistic update
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [menuKey]: !currentValue,
      }
    }))

    setSavingRole(role)
    try {
      const res = await fetch('/api/admin/role-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          permissions: {
            ...permissions[role],
            [menuKey]: !currentValue,
          }
        }),
      })

      if (!res.ok) {
        // Revert on failure
        setPermissions(prev => ({
          ...prev,
          [role]: {
            ...prev[role],
            [menuKey]: currentValue,
          }
        }))
      }
    } catch (error) {
      console.error('Failed to update permission:', error)
      // Revert on failure
      setPermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [menuKey]: currentValue,
        }
      }))
    } finally {
      setSavingRole(null)
    }
  }

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'production_team': return 'Production Team'
      case 'sales': return 'Sales'
      default: return role
    }
  }

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

  const resetInviteForm = () => {
    setInviteForm({
      name: '',
      email: '',
      phone: '',
      role: 'client',
      clientIds: [],
    })
    setInviteError(null)
    setInviteSuccess(null)
  }

  const handleInviteUser = async () => {
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          fullName: inviteForm.name,
          phone: inviteForm.phone || undefined,
          role: inviteForm.role,
          clientIds: inviteForm.role === 'client' ? inviteForm.clientIds : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invitation')
        return
      }

      setInviteSuccess(`Invitation sent to ${inviteForm.email}`)

      // Refresh users list
      const usersRes = await fetch('/api/admin/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setAdminUsers(usersData.adminUsers || [])
        setClientUsers(usersData.clientUsers || [])
      }

      // Close modal after short delay
      setTimeout(() => {
        setShowInviteModal(false)
        resetInviteForm()
      }, 2000)

    } catch (error) {
      setInviteError('Failed to send invitation. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleClientToggle = (clientId: string) => {
    setInviteForm(prev => {
      const isSelected = prev.clientIds.includes(clientId)
      return {
        ...prev,
        clientIds: isSelected
          ? prev.clientIds.filter(id => id !== clientId)
          : [...prev.clientIds, clientId]
      }
    })
  }

  const handleResendInvite = async (inviteId: string) => {
    // TODO: Implement resend invite API
    console.log('Resend invite:', inviteId)
    alert('Resend functionality coming soon')
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
          {activeTab === 'users' && (
            <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Invite User
            </button>
          )}
        </div>

        {/* Tabs - Only show Roles Management tab for super_admin */}
        {currentUserRole === 'super_admin' && (
          <div className="tabs-container" style={{ marginBottom: '24px' }}>
            <div className="tab-buttons" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
              <button
                className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: activeTab === 'users' ? 'var(--pyrus-brown)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'users' ? '600' : '400',
                  borderBottom: activeTab === 'users' ? '2px solid var(--pyrus-brown)' : '2px solid transparent',
                  marginBottom: '-1px',
                  fontSize: '14px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '8px', verticalAlign: 'text-bottom' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Users
              </button>
              <button
                className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
                onClick={() => setActiveTab('roles')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: activeTab === 'roles' ? 'var(--pyrus-brown)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'roles' ? '600' : '400',
                  borderBottom: activeTab === 'roles' ? '2px solid var(--pyrus-brown)' : '2px solid transparent',
                  marginBottom: '-1px',
                  fontSize: '14px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '8px', verticalAlign: 'text-bottom' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Roles Management
              </button>
            </div>
          </div>
        )}

        {/* Roles Management Tab Content */}
        {activeTab === 'roles' && currentUserRole === 'super_admin' && (
          <div className="roles-management">
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Configure which menu items each role can access. Super Admin always has full access.
              </p>
            </div>

            {permissionsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading permissions...
              </div>
            ) : (
              <div className="permissions-matrix" style={{ overflowX: 'auto' }}>
                <table className="users-table" style={{ minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', minWidth: '180px' }}>Menu Item</th>
                      {roles.map(role => (
                        <th key={role} style={{ textAlign: 'center', minWidth: '120px' }}>
                          {getRoleDisplayName(role)}
                          {role === 'super_admin' && (
                            <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                              (Always Full Access)
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.key}>
                        <td style={{ fontWeight: '500' }}>{item.label}</td>
                        {roles.map(role => (
                          <td key={`${role}-${item.key}`} style={{ textAlign: 'center' }}>
                            {role === 'super_admin' ? (
                              <span style={{ color: 'var(--success-color)' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </span>
                            ) : (
                              <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={permissions[role]?.[item.key] ?? false}
                                  onChange={() => handlePermissionToggle(role, item.key, permissions[role]?.[item.key] ?? false)}
                                  disabled={savingRole === role}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: 'var(--pyrus-brown)',
                                  }}
                                />
                              </label>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {savingRole && (
              <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Saving changes...
              </div>
            )}
          </div>
        )}

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <>
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

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <div className="pending-invites-section" style={{ marginBottom: '32px' }}>
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Pending Invites ({pendingInvites.length})
            </h3>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Invited By</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvites.map((invite) => {
                    const roleContent = getRoleBadgeContent(invite.role as AdminRole)
                    const expiresDate = new Date(invite.expiresAt)
                    const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    return (
                      <tr key={invite.id}>
                        <td className="user-name">
                          <div className="user-avatar" style={{ background: invite.avatarColor, opacity: 0.7 }}>
                            {invite.initials}
                          </div>
                          <span>{invite.name}</span>
                        </td>
                        <td>
                          <span className={`role-badge ${roleContent.className}`}>
                            {roleContent.icon}
                            {roleContent.label}
                          </span>
                        </td>
                        <td>{invite.email}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{invite.invitedBy || '-'}</td>
                        <td>
                          <span style={{
                            color: daysLeft <= 2 ? 'var(--error-color)' : 'var(--text-secondary)',
                            fontSize: '13px'
                          }}>
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleResendInvite(invite.id)}
                          >
                            Resend
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin Users Section - Only show if user can see admin users */}
        {adminUsers.length > 0 && (
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
        </div>
        )}

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
          </>
        )}
      </div>

      {/* Unified Invite User Modal */}
      {showInviteModal && (
        <div className="modal-overlay active" onClick={() => { setShowInviteModal(false); resetInviteForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Invite User</h2>
              <button className="modal-close" onClick={() => { setShowInviteModal(false); resetInviteForm(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {inviteSuccess && (
                <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#DEF7EC', color: '#03543F', borderRadius: '8px', fontSize: '14px' }}>
                  {inviteSuccess}
                </div>
              )}
              {inviteError && (
                <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#FDE8E8', color: '#9B1C1C', borderRadius: '8px', fontSize: '14px' }}>
                  {inviteError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-control"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as InviteRole, clientIds: [] })}
                  disabled={isInviting}
                >
                  <option value="client">Client User</option>
                  <option value="sales">Sales</option>
                  <option value="production_team">Production Team</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter full name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  disabled={isInviting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter email address"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  disabled={isInviting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>(optional)</span></label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="(555) 123-4567"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  disabled={isInviting}
                />
              </div>

              {/* Client Selection - only shown for client role */}
              {inviteForm.role === 'client' && (
                <div className="form-group">
                  <label className="form-label">Assign to Clients</label>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Select one or more clients this user will have access to.
                  </p>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px' }}>
                    {clients.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px' }}>No clients available</p>
                    ) : (
                      clients.map((client) => (
                        <label
                          key={client.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            backgroundColor: inviteForm.clientIds.includes(client.id) ? 'var(--bg-hover)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={inviteForm.clientIds.includes(client.id)}
                            onChange={() => handleClientToggle(client.id)}
                            disabled={isInviting}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--pyrus-brown)' }}
                          />
                          <span style={{ fontSize: '14px' }}>{client.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {inviteForm.role === 'client' && inviteForm.clientIds.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '8px' }}>
                      Please select at least one client
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => { setShowInviteModal(false); resetInviteForm(); }}
                disabled={isInviting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleInviteUser}
                disabled={isInviting || !inviteForm.name || !inviteForm.email || (inviteForm.role === 'client' && inviteForm.clientIds.length === 0)}
              >
                {isInviting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M22 2L11 13"></path>
                      <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                    </svg>
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
