interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export function Sparkline({ data, width = 120, height = 32, color = '#059669' }: SparklineProps) {
  if (data.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>No history</span>
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Add padding
  const padding = 4
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Generate path
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Determine trend color
  const trendColor = data[data.length - 1] >= data[0] ? '#16a34a' : '#dc2626'

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path
        d={pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={padding + chartWidth}
        cy={padding + chartHeight - ((data[data.length - 1] - min) / range) * chartHeight}
        r="2.5"
        fill={trendColor}
      />
    </svg>
  )
}
