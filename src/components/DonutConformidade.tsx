import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface DonutSlice {
  name: string
  value: number
  color: string
}

export function DonutConformidade({
  data,
  centerLabel,
  centerValue,
  height = 240,
}: {
  data: DonutSlice[]
  centerLabel?: string
  centerValue?: string
  height?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const slices = total === 0 ? [{ name: 'Sem dados', value: 1, color: '#e2e8f0' }] : data

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={total === 0 ? 0 : 2}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {slices.map((s, i) => (
              <Cell key={i} fill={s.color} />
            ))}
          </Pie>
          {total > 0 && (
            <Tooltip
              formatter={(value: number, name: string) => [`${value}`, name]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-2xl font-bold text-slate-800">{centerValue}</span>}
          {centerLabel && <span className="text-xs font-medium text-slate-500">{centerLabel}</span>}
        </div>
      )}
    </div>
  )
}

export function LegendaDonut({ data }: { data: DonutSlice[] }) {
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            {d.name}
          </span>
          <span className="font-semibold text-slate-800">{d.value}</span>
        </li>
      ))}
    </ul>
  )
}
