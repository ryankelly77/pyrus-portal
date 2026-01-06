'use client'

import type { Product } from '@/types/recommendation'

interface ProductCardProps {
  product: Product
  onDragStart: (e: React.DragEvent, product: Product) => void
  onInfoClick: (product: Product) => void
}

export function ProductCard({ product, onDragStart, onInfoClick }: ProductCardProps) {
  const getPriceDisplay = () => {
    const { monthlyPrice, onetimePrice } = product
    if (monthlyPrice > 0 && onetimePrice > 0) {
      return `($${monthlyPrice}/mo for 12 months) or ($${onetimePrice.toLocaleString()} one-time)`
    }
    if (monthlyPrice > 0) {
      return `($${monthlyPrice}/mo)`
    }
    if (onetimePrice > 0) {
      return `($${onetimePrice.toLocaleString()} one-time)`
    }
    return ''
  }

  return (
    <div
      className="service-item"
      draggable
      onDragStart={(e) => onDragStart(e, product)}
      data-monthly={product.monthlyPrice}
      data-onetime={product.onetimePrice}
      data-category={product.category}
      data-requires={product.requires || undefined}
      data-has-quantity={product.hasQuantity || undefined}
    >
      <div className="service-item-header">
        <span className="service-item-title">{product.name}</span>
        <button
          className="info-btn"
          onClick={(e) => {
            e.stopPropagation()
            onInfoClick(product)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </div>
      <div className="service-item-price">{getPriceDisplay()}</div>
      <p className="service-item-desc">{product.description}</p>
    </div>
  )
}
