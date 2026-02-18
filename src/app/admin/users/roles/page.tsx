'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface MenuItem {
  key: string
  label: string
}

interface RolePermissions {
  [role: string]: {
    [menuKey: string]: boolean
  }
}

export default function RolesManagementPage() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<RolePermissions>({})
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingRole, setSavingRole] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // Fetch current user role and redirect if not super_admin
  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          if (data.currentUserRole !== 'super_admin') {
            // Redirect non-super_admin users
            router.push('/admin/users')
            return
          }
          setCurrentUserRole(data.currentUserRole)
        }
      } catch (error) {
        console.error('Failed to check user role:', error)
        router.push('/admin/users')
      }
    }
    checkAccess()
  }, [router])

  // Fetch role permissions
  useEffect(() => {
    if (currentUserRole === 'super_admin') {
      const fetchPermissions = async () => {
        setIsLoading(true)
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
          setIsLoading(false)
        }
      }
      fetchPermissions()
    }
  }, [currentUserRole])

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

  if (!currentUserRole) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Checking access...
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading permissions...
      </div>
    )
  }

  return (
    <div className="roles-management">
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Configure which menu items each role can access. Super Admin always has full access.
        </p>
      </div>

      <div className="permissions-matrix" style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '180px repeat(4, 120px)',
          gap: '0',
          minWidth: '660px'
        }}>
          {/* Header Row */}
          <div style={{
            padding: '12px',
            fontWeight: 500,
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-light)'
          }}>
            Menu Item
          </div>
          {roles.map(role => (
            <div key={role} style={{
              padding: '12px',
              textAlign: 'center',
              fontWeight: 500,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-light)'
            }}>
              {getRoleDisplayName(role)}
              {role === 'super_admin' && (
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
                  (Always Full Access)
                </span>
              )}
            </div>
          ))}

          {/* Data Rows */}
          {menuItems.map((item, idx) => (
            <>
              <div key={`label-${item.key}`} style={{
                padding: '12px',
                fontWeight: 500,
                fontSize: '14px',
                color: 'var(--text-primary)',
                borderBottom: idx === menuItems.length - 1 ? 'none' : '1px solid var(--border-light)'
              }}>
                {item.label}
              </div>
              {roles.map(role => (
                <div key={`${role}-${item.key}`} style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: idx === menuItems.length - 1 ? 'none' : '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {role === 'super_admin' ? (
                    <span style={{ color: 'var(--success-color)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                  ) : (
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
                  )}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>

      {savingRole && (
        <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Saving changes...
        </div>
      )}
    </div>
  )
}
