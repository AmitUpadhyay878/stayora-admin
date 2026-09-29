import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { Chart } from '@tanstack/charts/react'

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
  const labels = useMemo(() => slices.map((row) => row.label), [slices])
  const total = useMemo(() => slices.reduce((sum, row) => sum + row.value, 0), [slices])

  const definition = useMemo(() => {
    const allocated = pie(slices, { value: 'value' })
    return defineChart({
      marks: [
        polar({
          inset: 8,
          radiusRatio: 0.82,
          marks: [
            radialArc(allocated, {
              innerRadius: ({ radius }) => radius * 0.58,
              cornerRadius: 4,
              color: 'label',
              key: 'label',
            }),
          ],
          scales: {
            angle: null,
            radius: null,
          },
        }),
      ],
      scales: {
        x: null,
        y: null,
      },
      color: {
        domain: labels,
        range: COLORS,
      },
    })
  }, [labels, slices])

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-36 w-36 shrink-0">
        {total > 0 ? (
          <Chart
            definition={definition}
            height={144}
            initialWidth={144}
            ariaLabel={ariaLabel}
          />
        ) : (
          <svg viewBox="0 0 140 140" className="h-36 w-36" role="img" aria-label={ariaLabel}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="#E8F5D4" strokeWidth="16" />
          </svg>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
          {totalLabel}
        </div>
      </div>
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
