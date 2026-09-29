import { useMemo } from 'react'
import { barY, defineChart, group } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'

const SERIES_COLORS = {
  booked: '#C5E86A',
  cancelled: '#F5C84C',
} as const

export function GroupedBarChart({
  data,
  ariaLabel,
  seriesLabels = { booked: 'Booked', cancelled: 'Cancelled' },
}: {
  data: Array<{ label: string; booked: number; cancelled: number }>
  ariaLabel: string
  seriesLabels?: { booked: string; cancelled: string }
}) {
  const rows = useMemo(
    () =>
      data.flatMap((row) => [
        { label: row.label, series: seriesLabels.booked, value: row.booked },
        { label: row.label, series: seriesLabels.cancelled, value: row.cancelled },
      ]),
    [data, seriesLabels.booked, seriesLabels.cancelled],
  )

  const definition = useMemo(() => {
    return defineChart({
      marks: [
        barY(rows, {
          x: 'label',
          y: 'value',
          color: 'series',
          layout: group({ padding: 0.18 }),
          radius: 4,
        }),
      ],
      scales: {
        x: {
          scale: () =>
            scaleBand<string>()
              .domain(data.map((row) => row.label))
              .padding(0.18),
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
        },
      },
      color: {
        domain: [seriesLabels.booked, seriesLabels.cancelled],
        range: [SERIES_COLORS.booked, SERIES_COLORS.cancelled],
      },
      tooltip,
    })
  }, [data, rows, seriesLabels.booked, seriesLabels.cancelled])

  if (data.length === 0) return null

  return (
    <div>
      <Chart
        definition={definition}
        height={176}
        initialWidth={640}
        ariaLabel={ariaLabel}
      />
      <ul className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS.booked }} />
          {seriesLabels.booked}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS.cancelled }} />
          {seriesLabels.cancelled}
        </li>
      </ul>
    </div>
  )
}
