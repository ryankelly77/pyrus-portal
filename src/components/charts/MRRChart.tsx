'use client'

import { useState } from 'react'

export interface MRRDataPoint {
  month: string
  label: string
  mrr: number
}

interface MRRChartProps {
  data: MRRDataPoint[]
  height?: number
}

export function MRRChart({ data, height = 220 }: MRRChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; mrr: number } | null>(null)

  if (data.length === 0) return null

  // Chart dimensions
  const width = 400
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate min/max for scaling
  const mrrValues = data.map(d => d.mrr)
  const maxMRR = Math.max(...mrrValues, 100)
  const minMRR = Math.min(...mrrValues, 0)

  // Add 10% padding to the top
  const yMax = maxMRR * 1.1
  const yMin = Math.max(0, minMRR * 0.9)
  const yRange = yMax - yMin || 1

  // Calculate points for the line
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
    const y = padding.top + chartHeight - ((d.mrr - yMin) / yRange) * chartHeight
    return { x, y, mrr: d.mrr, label: d.label }
  })

  // Create line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  // Create area path (fill under the line)
  const areaPath = linePath + ` L${points[points.length - 1].x},${padding.top + chartHeight} L${points[0].x},${padding.top + chartHeight} Z`

  // Y-axis labels (4 values)
  const yAxisLabels = [0, 1, 2, 3].map(i => {
    const value = yMin + (yRange * (3 - i)) / 3
    const y = padding.top + (i / 3) * chartHeight
    return { value: Math.round(value), y }
  })

  // Format currency for axis
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    }
    return `$${value}`
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: 'translate(-50%, -130%)',
            background: '#1F2937',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {tooltip.label}: ${tooltip.mrr.toLocaleString()}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {yAxisLabels.map((label, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray={i === yAxisLabels.length - 1 ? undefined : "4"}
          />
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="mrrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#mrrGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points with hover */}
        {points.map((p, i) => (
          <g
            key={i}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, label: p.label, mrr: p.mrr })}
            onMouseLeave={() => setTooltip(null)}
          >
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 5 : 3}
              fill="#059669"
            />
          </g>
        ))}

        {/* Y-axis labels */}
        {yAxisLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={label.y + 4}
            fill="#9CA3AF"
            fontSize="10"
            textAnchor="end"
          >
            {formatCurrency(label.value)}
          </text>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 10}
            fill="#9CA3AF"
            fontSize="11"
            textAnchor="middle"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
