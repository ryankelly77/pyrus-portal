'use client'

import { useState } from 'react'
import type { Product, ServiceCategory } from '@/types/recommendation'
import { ProductCard } from './ProductCard'
import { categoryLabels, categoryDescriptions } from '@/lib/data/products'

interface CategoryColumnProps {
  category: ServiceCategory
  products: Product[]
  onDragStart: (e: React.DragEvent, product: Product) => void
  onInfoClick: (product: Product) => void
}

export function CategoryColumn({
  category,
  products,
  onDragStart,
  onInfoClick,
}: CategoryColumnProps) {
  const [expanded, setExpanded] = useState(true)

  const categoryClass = `service-category service-category-${category}${expanded ? ' expanded' : ''}`

  return (
    <div className={categoryClass}>
      <button
        className="service-category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{categoryLabels[category]}</span>
        <svg
          className="collapse-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      {categoryDescriptions[category] && (
        <p className="service-category-desc">{categoryDescriptions[category]}</p>
      )}
      <div className="service-category-items">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDragStart={onDragStart}
            onInfoClick={onInfoClick}
          />
        ))}
      </div>
    </div>
  )
}
