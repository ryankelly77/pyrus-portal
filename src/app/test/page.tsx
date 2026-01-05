import { AdminSidebar, AdminHeader } from '@/components/layout'

export default function TestPage() {
  return (
    <div className="admin-layout">
      <AdminSidebar isSuperAdmin={true} />
      <main className="admin-main">
        <AdminHeader
          title="Clients"
          user={{ name: 'Ryan Kelly', initials: 'RK' }}
          hasNotifications={true}
        />
        <div className="admin-content">
          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-content">
              <p>Manage your client accounts and view their marketing performance</p>
            </div>
            <button className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Client
            </button>
          </div>

          {/* Search and Filters */}
          <div className="clients-toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" placeholder="Search clients..." id="clientSearch" />
            </div>
            <div className="filter-buttons">
              <button className="filter-btn active" data-filter="all">All Clients</button>
              <button className="filter-btn" data-filter="active">Active</button>
              <button className="filter-btn" data-filter="onboarding">Onboarding</button>
              <button className="filter-btn" data-filter="paused">Paused</button>
            </div>
            <div className="sort-dropdown">
              <label className="sort-label">Sort by:</label>
              <select id="clientSort" className="sort-select">
                <option value="name">Name</option>
                <option value="growth-desc">Growth (High to Low)</option>
                <option value="growth-asc">Growth (Low to High)</option>
              </select>
            </div>
            <div className="view-toggle">
              <button className="view-toggle-btn active" data-view="grid" title="Grid view">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
              </button>
              <button className="view-toggle-btn" data-view="list" title="List view">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Clients Grid */}
          <div className="clients-grid" id="clientsGrid">
            {/* TC Clinical Services */}
            <div className="client-card" data-status="active" data-growth="32" data-name="TC Clinical Services">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar">TC</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>TC Clinical Services</h3>
                  <p className="client-card-email">dlg.mdservices@gmail.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">4 services</span>
                    <span>•</span>
                    <span>Since Sep 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">2,847</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">28</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+32%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Raptor Vending */}
            <div className="client-card" data-status="active" data-growth="28" data-name="Raptor Vending">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#2563EB' }}>RV</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>Raptor Vending</h3>
                  <p className="client-card-email">info@raptorvending.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">3 services</span>
                    <span>•</span>
                    <span>Since Jun 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">4,521</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">45</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+28%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Raptor Services */}
            <div className="client-card" data-status="active" data-growth="41" data-name="Raptor Services">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#7C3AED' }}>RS</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>Raptor Services</h3>
                  <p className="client-card-email">contact@raptorservices.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">5 services</span>
                    <span>•</span>
                    <span>Since Mar 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">3,892</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">52</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+41%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Gohfr */}
            <div className="client-card" data-status="onboarding" data-growth="0" data-name="Gohfr">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#0B7277' }}>GO</div>
                  <span className="status-badge onboarding">Onboarding</span>
                </div>
                <div className="client-card-body">
                  <h3>Gohfr</h3>
                  <p className="client-card-email">hello@gohfr.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">3 services</span>
                    <span>•</span>
                    <span>Since Dec 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">--</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">--</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">--</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Espronceda Law */}
            <div className="client-card" data-status="active" data-growth="15" data-name="Espronceda Law">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#DC2626' }}>EL</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>Espronceda Law</h3>
                  <p className="client-card-email">maria@espronceda.law</p>
                  <div className="client-card-meta">
                    <span className="services-link">4 services</span>
                    <span>•</span>
                    <span>Since Aug 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">1,245</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">18</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+15%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* American Fence & Deck - Paused */}
            <div className="client-card" data-status="paused" data-growth="0" data-name="American Fence & Deck">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#6B7280' }}>AF</div>
                  <span className="status-badge paused">Paused</span>
                </div>
                <div className="client-card-body">
                  <h3>American Fence & Deck</h3>
                  <p className="client-card-email">sales@americanfence.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">5 services</span>
                    <span>•</span>
                    <span>Since Jan 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value muted">6,234</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value muted">87</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value muted">Paused</span>
                    <span className="client-stat-label">Status</span>
                  </div>
                </div>
                <div className="client-card-paused-overlay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                  <span>Campaign Paused</span>
                </div>
              </a>
            </div>

            {/* Peak Performance Gym */}
            <div className="client-card" data-status="active" data-growth="24" data-name="Peak Performance Gym">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#EA580C' }}>PP</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>Peak Performance Gym</h3>
                  <p className="client-card-email">owner@peakperformancegym.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">4 services</span>
                    <span>•</span>
                    <span>Since Oct 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">1,892</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">34</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+24%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Sunrise Dental */}
            <div className="client-card" data-status="active" data-growth="19" data-name="Sunrise Dental">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#0891B2' }}>SD</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>Sunrise Dental</h3>
                  <p className="client-card-email">dr.smith@sunrisedental.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">3 services</span>
                    <span>•</span>
                    <span>Since Jul 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">2,156</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">41</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+19%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Metro Plumbing */}
            <div className="client-card" data-status="active" data-growth="36" data-name="Metro Plumbing">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#4F46E5' }}>MP</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>Metro Plumbing</h3>
                  <p className="client-card-email">dispatch@metroplumbing.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">5 services</span>
                    <span>•</span>
                    <span>Since Apr 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">5,234</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">89</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+45%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Green Thumb Landscaping */}
            <div className="client-card" data-status="onboarding" data-growth="0" data-name="Green Thumb Landscaping">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#16A34A' }}>GT</div>
                  <span className="status-badge onboarding">Onboarding</span>
                </div>
                <div className="client-card-body">
                  <h3>Green Thumb Landscaping</h3>
                  <p className="client-card-email">info@greenthumb.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">4 services</span>
                    <span>•</span>
                    <span>Since Dec 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">--</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">--</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">--</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Horizon Real Estate */}
            <div className="client-card" data-status="active" data-growth="37" data-name="Horizon Real Estate">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#9333EA' }}>HR</div>
                  <span className="status-badge active">Active</span>
                </div>
                <div className="client-card-body">
                  <h3>Horizon Real Estate</h3>
                  <p className="client-card-email">broker@horizonre.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">3 services</span>
                    <span>•</span>
                    <span>Since May 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value">3,421</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value">56</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value positive">+37%</span>
                    <span className="client-stat-label">Growth</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Coastal Insurance - Paused */}
            <div className="client-card" data-status="paused" data-growth="0" data-name="Coastal Insurance">
              <a href="#" className="client-card-link">
                <div className="client-card-header">
                  <div className="client-card-avatar" style={{ background: '#6B7280' }}>CI</div>
                  <span className="status-badge paused">Paused</span>
                </div>
                <div className="client-card-body">
                  <h3>Coastal Insurance</h3>
                  <p className="client-card-email">agent@coastalins.com</p>
                  <div className="client-card-meta">
                    <span className="services-link">4 services</span>
                    <span>•</span>
                    <span>Since Feb 2025</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className="client-stat-value muted">4,128</span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value muted">62</span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    <span className="client-stat-value muted">Paused</span>
                    <span className="client-stat-label">Status</span>
                  </div>
                </div>
                <div className="client-card-paused-overlay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                  <span>Campaign Paused</span>
                </div>
              </a>
            </div>
          </div>

          {/* Load More */}
          <div className="load-more-container">
            <p className="clients-count">Showing 12 of 147 clients</p>
            <button className="btn btn-secondary load-more-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              Load More
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
