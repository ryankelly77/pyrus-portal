# Page Tabs Skill - Pyrus Portal

This skill documents how to create tabbed pages in Pyrus Portal using route-based navigation.

## 1. Route-Based Tab Pattern

**IMPORTANT:** Tabs use URL routes, NOT client state (useState).

### How It Works
- **Parent `layout.tsx`** renders the tab navigation bar
- **Child `page.tsx`** files render the content for each tab
- The URL determines which tab is active
- Next.js App Router handles the routing automatically

### File Structure Example
```
/src/app/admin/settings/
├── layout.tsx          # Tab navigation (shared across all tabs)
├── page.tsx            # Content for /admin/settings (Profile tab)
├── checklist/
│   └── page.tsx        # Content for /admin/settings/checklist
├── questions/
│   └── page.tsx        # Content for /admin/settings/questions
├── videos/
│   └── page.tsx        # Content for /admin/settings/videos
└── announcements/
    └── page.tsx        # Content for /admin/settings/announcements
```

---

## 2. Required CSS Classes

Use the global CSS classes. **DO NOT create custom tab styles.**

### Container: `.admin-tabs`
```css
.admin-tabs {
    display: flex;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border-color);  /* #D4DCD2 */
}
```

### Tab Button: `.admin-tab`
```css
.admin-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-secondary);     /* #5A6358 */
    font-weight: 500;
    font-size: 14px;
    font-family: inherit;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: all 0.2s;
    white-space: nowrap;
}
```

### Hover State: `.admin-tab:hover`
```css
.admin-tab:hover {
    color: var(--text-primary);       /* #1A1F16 */
}
```

### Active State: `.admin-tab.active`
```css
.admin-tab.active {
    color: var(--primary);            /* #885430 (Pyrus brown) */
    border-bottom-color: var(--primary);
}
```

### Tab Icon Styling
```css
.admin-tab svg {
    flex-shrink: 0;
}
```

### Optional Badges
```css
.admin-tab .tab-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 4px;
}

.admin-tab .tab-badge.coming-soon {
    background-color: var(--pyrus-sage);
    color: white;
}

.admin-tab .tab-badge.count {
    background-color: var(--pyrus-green-wash);
    color: var(--pyrus-green);
}

.admin-tab .tab-badge.alert {
    background-color: #DC2626;
    color: white;
}
```

---

## 3. HTML/JSX Structure

### Basic Tab Container
```tsx
<div className="admin-tabs">
  {tabs.map((tab) => (
    <Link
      key={tab.name}
      href={tab.href}
      className={`admin-tab ${isActive(tab.href) ? 'active' : ''}`}
    >
      {tab.icon}
      {tab.name}
    </Link>
  ))}
</div>
```

### Active Tab Detection
```tsx
// For the root route, use exact match
// For child routes, use startsWith
const isActive = (href: string) => {
  if (href === '/admin/settings') {
    return pathname === '/admin/settings'
  }
  return pathname.startsWith(href)
}
```

---

## 4. Complete Working Example

### layout.tsx (Parent - Renders Tabs)
```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const tabs = [
  {
    name: 'Email Templates',
    href: '/admin/emails',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    ),
  },
  {
    name: 'Automation & Workflows',
    href: '/admin/emails/automations',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <polyline points="16 3 21 3 21 8"></polyline>
        <line x1="4" y1="20" x2="21" y2="3"></line>
        <polyline points="21 16 21 21 16 21"></polyline>
        <line x1="15" y1="15" x2="21" y2="21"></line>
        <line x1="4" y1="4" x2="9" y2="9"></line>
      </svg>
    ),
  },
]

export default function EmailSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, hasNotifications } = useUserProfile()

  // Determine active tab
  const isActive = (href: string) => {
    if (href === '/admin/emails') {
      return pathname === '/admin/emails'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <AdminHeader
        title="Emails"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Optional Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage email templates and automation workflows</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="admin-tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`admin-tab ${isActive(tab.href) ? 'active' : ''}`}
            >
              {tab.icon}
              {tab.name}
            </Link>
          ))}
        </div>

        {/* Tab Content - Rendered by child page.tsx */}
        {children}
      </div>
    </>
  )
}
```

### page.tsx (Child - Tab Content)
```tsx
'use client'

import { useState, useEffect } from 'react'

export default function EmailTemplatesPage() {
  // Just render the content - no tab logic needed here
  return (
    <div>
      <h2>Email Templates</h2>
      {/* Page content */}
    </div>
  )
}
```

### automations/page.tsx (Another Child Tab)
```tsx
'use client'

export default function AutomationsPage() {
  return (
    <div>
      <h2>Automation & Workflows</h2>
      {/* Page content */}
    </div>
  )
}
```

---

## 5. Common Mistakes to Avoid

### DO NOT use useState for tab state
```tsx
// WRONG - Don't do this
const [activeTab, setActiveTab] = useState('templates')

// RIGHT - Use URL routing
const pathname = usePathname()
const isActive = pathname === '/admin/emails'
```

### DO NOT create custom tab styles
```tsx
// WRONG - Don't use inline styles for tabs
<div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>

// RIGHT - Use the global CSS classes
<div className="admin-tabs">
```

### DO NOT forget the active class logic
```tsx
// WRONG - Missing active class
<Link href={tab.href} className="admin-tab">

// RIGHT - Include active state
<Link href={tab.href} className={`admin-tab ${isActive(tab.href) ? 'active' : ''}`}>
```

### DO NOT use exact match for all routes
```tsx
// WRONG - This won't work for nested routes
const isActive = pathname === tab.href

// RIGHT - Use exact match only for root, startsWith for children
const isActive = (href: string) => {
  if (href === '/admin/settings') {
    return pathname === '/admin/settings'
  }
  return pathname.startsWith(href)
}
```

### DO NOT put tab logic in child pages
```tsx
// WRONG - Tab navigation in page.tsx
export default function ChecklistPage() {
  return (
    <>
      <div className="admin-tabs">...</div>  {/* Don't do this */}
      <div>Content</div>
    </>
  )
}

// RIGHT - Child pages only render content
export default function ChecklistPage() {
  return (
    <div>Content only - tabs are in layout.tsx</div>
  )
}
```

---

## 6. CSS Variable Reference

| Variable | Value | Usage |
|----------|-------|-------|
| `--primary` | `#885430` | Active tab text & border (Pyrus brown) |
| `--text-primary` | `#1A1F16` | Hover state text |
| `--text-secondary` | `#5A6358` | Default tab text |
| `--border-color` | `#D4DCD2` | Tab container bottom border |

---

## 7. Hiding Tabs on Certain Pages

Sometimes you want to hide tabs on edit/detail pages:

```tsx
export default function ProductsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Don't show tabs on edit pages
  const isEditPage = pathname.includes('/edit') || pathname.includes('/new')
  if (isEditPage) {
    return (
      <>
        <AdminHeader title="Product Management" ... />
        <div className="admin-content">
          {children}
        </div>
      </>
    )
  }

  // Normal layout with tabs
  return (
    <>
      <AdminHeader title="Product Management" ... />
      <div className="admin-content">
        <div className="admin-tabs">
          {/* tabs */}
        </div>
        {children}
      </div>
    </>
  )
}
```

---

## 8. Adding Badges to Tabs

```tsx
<Link
  href="/admin/notifications"
  className={`admin-tab ${isActive('/admin/notifications') ? 'active' : ''}`}
>
  <svg>...</svg>
  Notifications
  {unreadCount > 0 && (
    <span className="tab-badge alert">{unreadCount}</span>
  )}
</Link>
```
