import { useMemo } from 'react'
import { areaY, defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { tooltip } from '@tanstack/charts/tooltip'

export function AreaChart({
  data,
  ariaLabel,
}: {
  data: Array<{ label: string; value: number }>
  ariaLabel: string
}) {
  const definition = useMemo(() => {
    return defineChart({
      marks: [
        areaY(data, {
          x: 'label',
          y: 'value',
          y1: 0,
          fill: '#E8F5D4',
          fillOpacity: 1,
        }),
        lineY(data, {
          x: 'label',
          y: 'value',
          stroke: '#9CC74A',
          strokeWidth: 2.5,
          points: true,
          lineCap: 'butt',
        }),
      ],
      scales: {
        x: { scale: () => scalePoint<string>().padding(0.2) },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
        },
      },
      tooltip,
    })
  }, [data])

  if (data.length === 0) return null

  return (
    <Chart
      definition={definition}
      height={176}
      initialWidth={640}
      ariaLabel={ariaLabel}
    />
  )
}
