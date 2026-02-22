# Modal Component Skill - Pyrus Portal

This skill documents how to create and extract modal components in Pyrus Portal.

## 1. When to Extract Modals

### Extract when:
- **Page file exceeds ~2000 lines** - Large pages become hard to maintain
- **Modal is reused across pages** - Share the same modal in multiple places
- **Modal has complex logic** - Forms, API calls, state management, tabs
- **Modal has multiple sections** - Edit modals with tabs, multi-step wizards

### Keep inline when:
- Modal is simple (< 100 lines)
- Used only in one place
- No complex state management

---

## 2. File Structure

### Directory Pattern
```
/src/components/admin/[feature]/modals/
├── index.ts                    # Barrel export
├── edit-client-modal.tsx       # kebab-case file names
├── add-product-modal.tsx
└── result-alert-modal.tsx
```

### Barrel Export (index.ts)
```typescript
export { EditClientModal } from './edit-client-modal'
export { ResultAlertModal } from './result-alert-modal'
export { AddProductModal } from './add-product-modal'
```

### File Naming
- Use **kebab-case** for file names: `edit-client-modal.tsx`
- Use **PascalCase** for component names: `EditClientModal`
- Suffix with `-modal.tsx`

---

## 3. Modal Props Interface

### Standard Props Pattern
```typescript
interface EditClientModalProps {
  // Required: Open state
  isOpen: boolean
  onClose: () => void

  // Data: The item being edited (optional for create modals)
  client: ClientData
  clientId: string

  // Callbacks
  onSave: () => Promise<void>  // Called after successful save
  onDelete?: () => void        // Optional delete callback
}
```

### Props Breakdown

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Called when modal should close |
| `[item]` | `ItemType` | Depends | The data being viewed/edited |
| `[itemId]` | `string` | Depends | ID for API calls |
| `onSave` | `() => Promise<void>` | Yes | Refresh parent data after save |
| `onDelete` | `() => void` | No | Handle deletion |

---

## 4. Standard Modal Structure

### Basic Modal Template
```tsx
'use client'

import { useState, useEffect } from 'react'

interface MyModalProps {
  isOpen: boolean
  onClose: () => void
  item: ItemType
  onSave: () => Promise<void>
}

export function MyModal({ isOpen, onClose, item, onSave }: MyModalProps) {
  // Form state
  const [formData, setFormData] = useState({ name: '' })
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setFormData({ name: item.name })
    }
  }, [isOpen, item])

  // Early return if not open
  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to save')
      await onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Edit Item</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 5. CSS Classes

### Global Classes (use these - defined in styles.css)

#### Overlay
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-overlay.active {
  /* Controls visibility via display/opacity */
}
```

#### Modal Container
```css
.modal {
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Size variants */
.modal.modal-sm { width: 440px; }
.modal.modal-lg { width: 900px; max-width: 95vw; }
.modal.modal-xl { max-width: 1200px; width: 95%; }
```

#### Header
```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
```

#### Close Button
```css
.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: var(--bg-page);
  color: var(--text-primary);
}
```

#### Body
```css
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
```

#### Footer
```css
.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-page);
}
```

### Edit Modal Variant (larger modals with tabs)
```css
.edit-modal-overlay { /* Same as modal-overlay */ }
.edit-modal-content { max-width: 560px; }
.edit-modal-content.edit-modal-lg { max-width: 720px; }

/* Includes modal-tabs support */
.modal-tabs { display: flex; border-bottom: 1px solid var(--border-light); }
.modal-tab { padding: 12px 24px; cursor: pointer; }
.modal-tab.active { color: var(--pyrus-brown); border-bottom: 2px solid; }
```

---

## 6. State Management

### Keep State Inside Modal
```typescript
export function EditModal({ isOpen, onClose, item, onSave }: Props) {
  // Form state lives inside the modal
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        name: item.name,
        email: item.email,
      })
    }
  }, [isOpen, item])

  // ... rest of component
}
```

### Call Parent Callbacks
```typescript
const handleSave = async () => {
  setIsSaving(true)
  try {
    await fetch('/api/...', { ... })
    await onSave()  // Tell parent to refresh data
    onClose()       // Close the modal
  } catch (error) {
    // Handle error
  } finally {
    setIsSaving(false)
  }
}
```

### State That Should Stay in Parent
- Which item is selected
- Modal open/close state
- List data that modal edits

```typescript
// In parent page:
const [showEditModal, setShowEditModal] = useState(false)
const [selectedClient, setSelectedClient] = useState<Client | null>(null)

const handleEditClick = (client: Client) => {
  setSelectedClient(client)
  setShowEditModal(true)
}

const handleSave = async () => {
  await fetchClients()  // Refresh list
}

return (
  <>
    {/* ... page content */}
    <EditClientModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      client={selectedClient}
      onSave={handleSave}
    />
  </>
)
```

---

## 7. Complete Examples

### Simple Modal (Add Product)
```tsx
'use client'

import { useState } from 'react'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  availableProducts: Product[]
  onAdd: (productId: string, notes: string) => Promise<void>
}

export function AddProductModal({
  isOpen,
  onClose,
  availableProducts,
  onAdd,
}: AddProductModalProps) {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [notes, setNotes] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleClose = () => {
    setSelectedProductId('')
    setNotes('')
    onClose()
  }

  const handleAdd = async () => {
    if (!selectedProductId) return
    setIsAdding(true)
    try {
      await onAdd(selectedProductId, notes)
      handleClose()
    } finally {
      setIsAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay active" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Add Product</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="product-select">Select Product</label>
            <select
              id="product-select"
              className="form-control"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              <option value="">Choose a product...</option>
              {availableProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!selectedProductId || isAdding}
          >
            {isAdding ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Complex Modal with Tabs
```tsx
'use client'

import { useState, useEffect } from 'react'

interface EditClientModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  clientId: string
  onSave: () => Promise<void>
}

type ModalTab = 'general' | 'integrations' | 'billing'

export function EditClientModal({
  isOpen,
  onClose,
  client,
  clientId,
  onSave,
}: EditClientModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('general')
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && client) {
      setFormData({ name: client.name, email: client.email })
      setActiveTab('general')
    }
  }, [isOpen, client])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      await onSave()
      onClose()
    } catch (error) {
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-content edit-modal-lg" onClick={e => e.stopPropagation()}>
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
              <p className="modal-subtitle">Update client information</p>
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
        </div>

        <div className="modal-body">
          {activeTab === 'general' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Company Name</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          )}
          {activeTab === 'integrations' && <div>Integrations content</div>}
          {activeTab === 'billing' && <div>Billing content</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Usage in Parent Component
```tsx
import { EditClientModal, AddProductModal } from '@/components/admin/clients/modals'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const fetchClients = async () => {
    const res = await fetch('/api/admin/clients')
    const data = await res.json()
    setClients(data)
  }

  const handleEditClick = (client: Client) => {
    setSelectedClient(client)
    setShowEditModal(true)
  }

  return (
    <div>
      {clients.map(client => (
        <button key={client.id} onClick={() => handleEditClick(client)}>
          Edit {client.name}
        </button>
      ))}

      {selectedClient && (
        <EditClientModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          client={selectedClient}
          clientId={selectedClient.id}
          onSave={fetchClients}
        />
      )}
    </div>
  )
}
```

---

## 8. Extraction Checklist

When extracting a modal from a large page file:

### 1. Create the modal file
```bash
# Create directory if needed
mkdir -p src/components/admin/[feature]/modals

# Create the file
touch src/components/admin/[feature]/modals/[name]-modal.tsx
```

### 2. Define props interface
```typescript
interface MyModalProps {
  isOpen: boolean
  onClose: () => void
  // Add data and callback props
}
```

### 3. Move JSX to new file
- Copy the modal JSX from the page
- Add `'use client'` directive
- Import React hooks

### 4. Move related state (or keep in parent)
- **Move to modal**: Form state, loading state, error state
- **Keep in parent**: Open/close state, selected item, list data

### 5. Add to barrel export
```typescript
// In index.ts
export { MyModal } from './my-modal'
```

### 6. Import in parent page
```typescript
import { MyModal } from '@/components/admin/[feature]/modals'
```

### 7. Test all flows
- [ ] Modal opens correctly
- [ ] Data populates on open
- [ ] Form validation works
- [ ] Save completes and closes modal
- [ ] Cancel closes without saving
- [ ] Parent data refreshes after save
- [ ] Clicking overlay closes modal
- [ ] Close button works

---

## 9. Common Patterns

### Close on Escape Key
```tsx
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  if (isOpen) {
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }
}, [isOpen, onClose])
```

### Prevent Body Scroll
```tsx
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }
}, [isOpen])
```

### Loading State in Modal
```tsx
const [loading, setLoading] = useState(true)

useEffect(() => {
  if (isOpen) {
    setLoading(true)
    fetchData().then(data => {
      setFormData(data)
      setLoading(false)
    })
  }
}, [isOpen])

// In body:
{loading ? (
  <div className="modal-loading">Loading...</div>
) : (
  // Form content
)}
```

### Confirmation Sub-Modal
```tsx
const [showConfirm, setShowConfirm] = useState(false)

// Render nested modal:
{showConfirm && (
  <div className="modal-overlay active" onClick={() => setShowConfirm(false)} style={{ zIndex: 1001 }}>
    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
      <div className="modal-body">Are you sure?</div>
      <div className="modal-footer">
        <button onClick={() => setShowConfirm(false)}>Cancel</button>
        <button onClick={handleConfirm}>Confirm</button>
      </div>
    </div>
  </div>
)}
```
