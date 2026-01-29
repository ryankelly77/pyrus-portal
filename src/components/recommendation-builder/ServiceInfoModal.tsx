'use client'

import type { Product } from '@/types/recommendation'
import { serviceDetailContent } from '@/lib/data/service-details'

interface ServiceInfoModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function ServiceInfoModal({ product, isOpen, onClose }: ServiceInfoModalProps) {
  if (!isOpen || !product) return null

  // Check for database long_description first, then fall back to hardcoded content
  const hasLongDescription = !!product.longDescription
  const detailContent = !hasLongDescription && product.detailContent ? serviceDetailContent[product.detailContent] : null
  const isDetailedModal = hasLongDescription || !!detailContent

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Simple modal content
  const renderSimpleContent = () => {
    const { monthlyPrice, onetimePrice, description } = product

    return (
      <>
        <div className="modal-header">
          <h2 className="modal-title">{product.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {/* Pricing display */}
          <div className="service-modal-pricing">
            {monthlyPrice > 0 && onetimePrice > 0 ? (
              <>
                <div className="service-modal-price monthly">
                  <span className="price-value">${monthlyPrice}</span>
                  <span className="price-period">/month</span>
                </div>
                <span className="price-divider">or</span>
                <div className="service-modal-price onetime">
                  <span className="price-value">${onetimePrice.toLocaleString()}</span>
                  <span className="price-period">one-time</span>
                </div>
              </>
            ) : monthlyPrice > 0 ? (
              <div className="service-modal-price monthly">
                <span className="price-value">${monthlyPrice}</span>
                <span className="price-period">/month</span>
              </div>
            ) : onetimePrice > 0 ? (
              <div className="service-modal-price onetime">
                <span className="price-value">${onetimePrice.toLocaleString()}</span>
                <span className="price-period">one-time</span>
              </div>
            ) : null}
          </div>

          <div className="service-modal-description">
            <p>{description}</p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </>
    )
  }

  // Render long_description HTML from database
  const renderLongDescriptionContent = () => {
    if (!product.longDescription) return null

    return (
      <>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'none' }}>{product.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div
            className="service-detail long-description-content"
            dangerouslySetInnerHTML={{ __html: product.longDescription }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </>
    )
  }

  // Detailed modal content (legacy hardcoded)
  const renderDetailedContent = () => {
    if (!detailContent) return null

    return (
      <>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'none' }}>{product.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="service-detail">
            <div className="service-detail-header">
              <h2 className="service-detail-title">{detailContent.title}</h2>
              <p className="service-detail-tagline">{detailContent.tagline}</p>
            </div>

            {detailContent.imageUrl && (
              <div className="service-detail-image">
                <img src={detailContent.imageUrl} alt={detailContent.title} />
              </div>
            )}

            <div className="service-detail-intro">
              <p>{detailContent.intro}</p>

              {detailContent.callout && (
                <div className="service-callout">
                  <span className="service-callout-label">{detailContent.callout.label}</span>
                  <span className="service-callout-text">{detailContent.callout.text}</span>
                </div>
              )}

              {detailContent.simpleTerm && (
                <p>
                  <span className="service-callout-label">In simple terms:</span>{' '}
                  {detailContent.simpleTerm}
                </p>
              )}

              {detailContent.summary && (
                <p className="service-detail-summary">{detailContent.summary}</p>
              )}
            </div>

            {/* Deliverables */}
            {detailContent.deliverables.map((deliverable, index) => (
              <div
                key={index}
                className={`deliverable-card${deliverable.isBonus ? ' bonus' : ''}`}
              >
                <div className="deliverable-header">
                  <span className="deliverable-number">{deliverable.number}</span>
                  <h3 className="deliverable-title">
                    {deliverable.title}
                    {deliverable.isBonus && (
                      <span className="deliverable-bonus-tag">(Bonus)</span>
                    )}
                  </h3>
                </div>
                <div className="deliverable-body">
                  <p
                    className="deliverable-description"
                    dangerouslySetInnerHTML={{ __html: deliverable.description }}
                  />
                  <p className="deliverable-section-label">What&apos;s Included</p>
                  <div className="feature-grid">
                    {deliverable.features.map((feature, fIndex) => (
                      <div key={fIndex} className="feature-card">
                        <h4 className="feature-card-title">{feature.title}</h4>
                        <p className="feature-card-desc">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* CTA */}
            {detailContent.cta && (
              <div className="service-detail-cta">
                <h3 className="service-detail-cta-title">{detailContent.cta.title}</h3>
                <p className="service-detail-cta-text">{detailContent.cta.text}</p>

                {detailContent.upsell && (
                  <div className="service-upsell-box">
                    <p className="service-upsell-box-title">{detailContent.upsell.title}</p>
                    <p
                      className="service-upsell-box-text"
                      dangerouslySetInnerHTML={{ __html: detailContent.upsell.text }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </>
    )
  }

  return (
    <div className="modal-overlay active" onClick={handleOverlayClick}>
      <div className={`modal${isDetailedModal ? ' modal-xl' : ''}`} onClick={(e) => e.stopPropagation()}>
        {hasLongDescription ? renderLongDescriptionContent() : isDetailedModal ? renderDetailedContent() : renderSimpleContent()}
      </div>
    </div>
  )
}
