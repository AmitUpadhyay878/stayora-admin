export function GroupedBarChart({
  data,
  ariaLabel,
}: {
  data: Array<{ label: string; booked: number; cancelled: number }>
  ariaLabel: string
}) {
  const max = Math.max(1, ...data.flatMap((row) => [row.booked, row.cancelled]))
  const width = 360
  const height = 160
  const gap = 12
  const barWidth = Math.max(6, (width - gap * data.length) / (data.length * 2))
  return (
    <svg
      viewBox={`0 0 ${width} ${height + 24}`}
      className="h-44 w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {data.map((row, index) => {
        const x = index * (barWidth * 2 + gap) + 8
        const bookedH = (row.booked / max) * height
        const cancelledH = (row.cancelled / max) * height
        return (
          <g key={row.label}>
            <rect
              x={x}
              y={height - bookedH}
              width={barWidth}
              height={bookedH}
              rx="4"
              fill="#C5E86A"
            />
            <rect
              x={x + barWidth + 2}
              y={height - cancelledH}
              width={barWidth}
              height={cancelledH}
              rx="4"
              fill="#F5C84C"
            />
            <text
              x={x + barWidth}
              y={height + 16}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {row.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
