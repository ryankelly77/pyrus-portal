'use client'

import Link from 'next/link'

export default function ContentPage() {
  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Content Manager</h1>
        </div>
        <div className="client-top-header-right">
          <Link href="/notifications" className="btn-icon has-notification">
            <span className="notification-badge"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </Link>
          <Link href="/settings" className="user-menu-link">
            <div className="user-avatar-small">
              <span>JD</span>
            </div>
            <span className="user-name">Jon De La Garza</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Content Stats */}
        <div className="content-stats">
          <div className="content-stat-card urgent">
            <div className="stat-label">Urgent Reviews</div>
            <div className="stat-value">2</div>
            <div className="stat-desc">Less than 24 hours</div>
          </div>
          <div className="content-stat-card">
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value">5</div>
            <div className="stat-desc">Awaiting your review</div>
          </div>
          <div className="content-stat-card">
            <div className="stat-label">Approved</div>
            <div className="stat-value">2</div>
            <div className="stat-desc">Ready for publishing</div>
          </div>
          <div className="content-stat-card">
            <div className="stat-label">Published</div>
            <div className="stat-value">6</div>
            <div className="stat-desc">Live content</div>
          </div>
        </div>

        {/* Content Actions Bar */}
        <div className="content-actions-bar">
          <button className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            View Content Requirements
          </button>
          <div className="content-plan-inline">
            <span className="plan-inline-label">Your Plan:</span>
            <span className="plan-inline-item">(2) Blog posts</span>
            <span className="plan-inline-divider">•</span>
            <span className="plan-inline-item">(2) GBP posts</span>
            <span className="plan-inline-divider">•</span>
            <span className="plan-inline-item">(8) Social posts</span>
            <span className="plan-inline-divider">•</span>
            <span className="plan-inline-item">(4) AI graphics</span>
            <span className="plan-inline-suffix">per month</span>
          </div>
        </div>

        {/* Urgent Reviews Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3 className="urgent-title">Urgent Reviews</h3>
            <div className="content-filters">
              <button className="btn btn-outline btn-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Search
              </button>
              <button className="btn btn-outline btn-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Sort by Date
              </button>
            </div>
          </div>

          <div className="content-list">
            <div className="content-item urgent">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="time-remaining urgent">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">23 hours</span>
                </div>
              </div>
              <h4 className="content-title">Black Friday Sale Announcement</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 15
                </span>
              </div>
              <p className="content-preview">Get ready for our biggest sale of the year! This Black Friday, enjoy up to 50% off on all our digital marketing services...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>

            <div className="content-item urgent">
              <div className="content-item-header">
                <span className="platform-badge gbp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Google Business Profile
                </span>
                <div className="time-remaining urgent">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">18 hours</span>
                </div>
              </div>
              <h4 className="content-title">Limited Time Offer Post</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Google Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 18
                </span>
              </div>
              <p className="content-preview">This week only! Get a free SEO audit with any web design package. Limited slots available...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approval Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3>Pending Approval</h3>
          </div>
          <div className="content-list">
            <div className="content-item">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="time-remaining">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">4 days</span>
                </div>
              </div>
              <h4 className="content-title">2025 Marketing Trends You Need to Know</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 20
                </span>
              </div>
              <p className="content-preview">Stay ahead of the curve with these 10 marketing trends that will dominate 2025...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>

            <div className="content-item">
              <div className="content-item-header">
                <span className="platform-badge social">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  Social Posts
                </span>
                <div className="time-remaining">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">5 days</span>
                </div>
              </div>
              <h4 className="content-title">December Social Media Calendar</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  8 Posts
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 22
                </span>
              </div>
              <p className="content-preview">Your complete December social media content package: holiday promotions, year-end highlights, and New Year&apos;s preview...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>

            <div className="content-item">
              <div className="content-item-header">
                <span className="platform-badge ai-creative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  AI Creative
                </span>
                <div className="time-remaining">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">6 days</span>
                </div>
              </div>
              <h4 className="content-title">Holiday Promotion Graphics Package</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  4 Graphics
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 23
                </span>
              </div>
              <p className="content-preview">AI-generated promotional graphics for your holiday campaign: social banners, email headers, and website hero images...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3>Approved - Awaiting Publishing</h3>
          </div>
          <div className="content-list">
            <div className="content-item approved">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="status-approved">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Awaiting Publishing
                </div>
              </div>
              <h4 className="content-title">Complete Guide to Digital Marketing in 2024</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Approved Nov 19
                </span>
              </div>
              <p className="content-preview">Get ready to take your business to the next level with our comprehensive guide to digital marketing...</p>
              <div className="publishing-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Scheduled for publishing on Nov 21
              </div>
              <div className="content-actions">
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  View Approved Version
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Rush Publishing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Published Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3>Published Content</h3>
          </div>
          <div className="content-list">
            <div className="content-item published">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="status-published">
                  <span className="published-label">Published</span>
                  <span className="published-date">10 days ago</span>
                </div>
              </div>
              <h4 className="content-title">How to Improve Your Local SEO Rankings</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Published Nov 10
                </span>
              </div>
              <p className="content-preview">Learn the essential strategies for boosting your local search visibility and attracting more customers...</p>
              <div className="content-actions">
                <a href="https://example.com/blog/local-seo-rankings" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  View on Website
                </a>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Request Update
                </button>
              </div>
            </div>

            <div className="content-item published">
              <div className="content-item-header">
                <span className="platform-badge gbp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Google Business Profile
                </span>
                <div className="status-published">
                  <span className="published-label">Published</span>
                  <span className="published-date">9 days ago</span>
                </div>
              </div>
              <h4 className="content-title">Veterans Day Special Offer</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Google Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Published Nov 11
                </span>
              </div>
              <p className="content-preview">This Veterans Day, we&apos;re proud to offer 20% off all services for veterans and active military...</p>
              <div className="content-actions">
                <a href="https://business.google.com/posts" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  View on GBP
                </a>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Create Similar Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
