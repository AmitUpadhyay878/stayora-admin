export function AreaChart({
  data,
  ariaLabel,
}: {
  data: Array<{ label: string; value: number }>
  ariaLabel: string
}) {
  const width = 420
  const height = 160
  const max = Math.max(1, ...data.map((row) => row.value))
  const step = data.length > 1 ? width / (data.length - 1) : width
  const points = data.map((row, index) => {
    const x = index * step
    const y = height - (row.value / max) * (height - 8)
    return { x, y, label: row.label }
  })
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points.at(-1)?.x ?? 0},${height} L0,${height} Z`
  return (
    <svg
      viewBox={`0 0 ${width} ${height + 24}`}
      className="h-44 w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <path d={area} fill="#E8F5D4" />
      <path d={line} fill="none" stroke="#9CC74A" strokeWidth="2.5" />
      {points.map((point) => (
        <text
          key={point.label}
          x={point.x}
          y={height + 16}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          {point.label}
        </text>
      ))}
    </svg>
  )
}
