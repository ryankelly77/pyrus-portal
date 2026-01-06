'use client'

import { useState } from 'react'
import { AdminHeader } from '@/components/layout'

const permissions = [
  'Client Management',
  'Content Workflow',
  'Result Alerts',
  'Revenue / MRR',
  'Recommendations',
  'User Management',
  'Admin Settings',
  'Products Management',
  'Rewards Management',
]

export default function AdminSettingsPage() {
  const [firstName, setFirstName] = useState('Ryan')
  const [lastName, setLastName] = useState('Kelly')
  const [email, setEmail] = useState('ryan@pyrusdigital.com')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password validation
  const hasMinLength = newPassword.length >= 8
  const hasNumber = /\d/.test(newPassword)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0

  const handleSaveProfile = () => {
    alert('Profile updated successfully!')
  }

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      alert('Please enter your current password')
      return
    }
    if (!hasMinLength || !hasNumber || !hasSpecial) {
      alert('Password does not meet requirements')
      return
    }
    if (!passwordsMatch) {
      alert('Passwords do not match')
      return
    }
    alert('Password updated successfully!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleLogoutAllSessions = () => {
    if (confirm('Are you sure you want to log out of all other sessions?')) {
      alert('All other sessions have been logged out')
    }
  }

  return (
    <>
      <AdminHeader
        title="Settings"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage your admin profile and account settings</p>
          </div>
        </div>

        <div className="settings-layout">
          {/* Role & Access Section */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Role & Access</h2>
              <p>Your admin role and permissions</p>
            </div>
            <div className="settings-card-body">
              <div className="role-display">
                <div className="role-badge-large super-admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <div className="role-info">
                    <span className="role-title">Super Admin</span>
                    <span className="role-desc">Full access to all features and settings</span>
                  </div>
                </div>
                <div className="role-permissions">
                  <h4>Your Permissions</h4>
                  <div className="permissions-grid">
                    {permissions.map((permission) => (
                      <div key={permission} className="permission-item granted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Profile Information</h2>
              <p>Update your personal information and profile photo</p>
            </div>
            <div className="settings-card-body">
              {/* Profile Photo */}
              <div className="profile-photo-section">
                <div className="profile-photo-current">
                  <div className="profile-photo-large">
                    <span>RK</span>
                  </div>
                </div>
                <div className="profile-photo-actions">
                  <h4>Profile Photo</h4>
                  <p>JPG, PNG or GIF. Max size 2MB.</p>
                  <div className="photo-buttons">
                    <button className="btn btn-secondary btn-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Upload Photo
                    </button>
                    <button className="btn btn-outline btn-sm">Remove</button>
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                />
                <span className="form-hint">This email is used for login and notifications</span>
              </div>

              {/* Save Button */}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleSaveProfile}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Password & Security</h2>
              <p>Update your password to keep your account secure</p>
            </div>
            <div className="settings-card-body">
              {/* Current Password */}
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    className="form-input"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      {showCurrentPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    className="form-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      {showNewPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                <span className="form-hint">Minimum 8 characters with at least one number and one special character</span>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      {showConfirmPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="password-requirements">
                <p className="requirements-title">Password must contain:</p>
                <ul className="requirements-list">
                  <li className={`requirement ${hasMinLength ? 'met' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      {hasMinLength ? (
                        <polyline points="20 6 9 17 4 12"></polyline>
                      ) : (
                        <circle cx="12" cy="12" r="10"></circle>
                      )}
                    </svg>
                    At least 8 characters
                  </li>
                  <li className={`requirement ${hasNumber ? 'met' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      {hasNumber ? (
                        <polyline points="20 6 9 17 4 12"></polyline>
                      ) : (
                        <circle cx="12" cy="12" r="10"></circle>
                      )}
                    </svg>
                    At least one number
                  </li>
                  <li className={`requirement ${hasSpecial ? 'met' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      {hasSpecial ? (
                        <polyline points="20 6 9 17 4 12"></polyline>
                      ) : (
                        <circle cx="12" cy="12" r="10"></circle>
                      )}
                    </svg>
                    At least one special character
                  </li>
                  <li className={`requirement ${passwordsMatch ? 'met' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      {passwordsMatch ? (
                        <polyline points="20 6 9 17 4 12"></polyline>
                      ) : (
                        <circle cx="12" cy="12" r="10"></circle>
                      )}
                    </svg>
                    Passwords match
                  </li>
                </ul>
              </div>

              {/* Update Password Button */}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleUpdatePassword}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Update Password
                </button>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Session Information</h2>
              <p>Your current login session details</p>
            </div>
            <div className="settings-card-body">
              <div className="session-grid">
                <div className="session-item">
                  <div className="session-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  </div>
                  <div className="session-details">
                    <span className="session-label">Current Device</span>
                    <span className="session-value">MacBook Pro - Chrome</span>
                  </div>
                </div>
                <div className="session-item">
                  <div className="session-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="session-details">
                    <span className="session-label">Last Login</span>
                    <span className="session-value">Jan 3, 2026 at 9:15 AM</span>
                  </div>
                </div>
                <div className="session-item">
                  <div className="session-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div className="session-details">
                    <span className="session-label">Location</span>
                    <span className="session-value">San Antonio, TX</span>
                  </div>
                </div>
              </div>
              <div className="session-actions">
                <button className="btn btn-outline btn-danger-outline" onClick={handleLogoutAllSessions}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Log Out All Other Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
