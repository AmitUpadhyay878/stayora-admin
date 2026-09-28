const COLORS = ['#C5E86A', '#9CC74A', '#F5C84C', '#A7D8C3', '#E3EBE4', '#6B7C74']

export function DonutChart({
  slices,
  totalLabel,
  ariaLabel,
}: {
  slices: Array<{ label: string; value: number }>
  totalLabel: string
  ariaLabel: string
}) {
  const total = slices.reduce((sum, row) => sum + row.value, 0)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="0 0 140 140"
        className="h-36 w-36"
        role="img"
        aria-label={ariaLabel}
      >
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#E8F5D4" strokeWidth="16" />
        {total > 0
          ? slices.map((slice, index) => {
              const length = (slice.value / total) * circumference
              const circle = (
                <circle
                  key={slice.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="16"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              )
              offset += length
              return circle
            })
          : null}
        <text
          x="70"
          y="66"
          textAnchor="middle"
          className="fill-foreground"
          fontSize="14"
          fontWeight="700"
        >
          {totalLabel}
        </text>
      </svg>
      <ul className="grid gap-1 text-xs">
        {slices.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="text-muted-foreground">{slice.label}</span>
            <span className="font-medium tabular-nums">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
