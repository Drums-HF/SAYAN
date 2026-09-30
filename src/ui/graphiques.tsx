// Graphiques Recharts. Couleurs : jetons --serie-* (§11), sans valeur sémantique.
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { depuisHorodatage, libelleCourt } from '../lib/dates.ts'
import { formatKg } from '../lib/nombres.ts'
import type { PointJour, PointPoids } from '../lib/series.ts'

const AXE = {
  stroke: 'var(--text-faint)',
  tick: { fill: 'var(--text-faint)', fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const

const INFOBULLE = {
  contentStyle: {
    background: 'var(--surface-raised)',
    border: 'none',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 14,
  },
  labelStyle: { color: 'var(--text-muted)' },
  itemStyle: { color: 'var(--text)', padding: 0 },
  cursor: { stroke: 'var(--border)' },
} as const

export function Cadre({ children }: { children: ReactNode }) {
  return (
    <div className="graphique">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

function axeTemps(debut: number, fin: number) {
  return (
    <XAxis
      {...AXE}
      dataKey="t"
      type="number"
      scale="time"
      domain={[debut, fin]}
      tickFormatter={(t: number) => libelleCourt(depuisHorodatage(t))}
      minTickGap={24}
    />
  )
}

const libelleDate = (t: unknown) => libelleCourt(depuisHorodatage(Number(t)))

export function GraphiquePoids({ points, debut, fin }: { points: PointPoids[]; debut: number; fin: number }) {
  return (
    <Cadre>
      <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--surface-raised)" vertical={false} />
        {axeTemps(debut, fin)}
        <YAxis
          {...AXE}
          width={36}
          domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
          tickFormatter={(v: number) => String(v).replace('.', ',')}
          allowDecimals={false}
        />
        <Tooltip
          {...INFOBULLE}
          labelFormatter={libelleDate}
          formatter={(v, nom) => [`${formatKg(Number(v))} kg`, nom]}
        />
        <Line
          name="Trajectoire"
          dataKey="theorique"
          stroke="var(--serie-objectif)"
          strokeDasharray="5 5"
          strokeWidth={1.5}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        <Scatter name="Jalon" dataKey="jalon" fill="var(--serie-objectif)" isAnimationActive={false} />
        <Line
          name="Pesée"
          dataKey="brut"
          stroke="var(--text-faint)"
          strokeWidth={1}
          dot={{ r: 1.5, fill: 'var(--text-faint)', stroke: 'none' }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          name="Moyenne 7 jours"
          dataKey="lisse"
          stroke="var(--serie-poids)"
          strokeWidth={2.5}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </Cadre>
  )
}

export function GraphiqueBarres({
  points,
  couleur,
  unite,
  format,
  reference,
  debut,
  fin,
}: {
  points: PointJour[]
  couleur: string
  unite: string
  format: (v: number) => string
  reference?: number
  debut: number
  fin: number
}) {
  const demiJour = 43_200_000
  return (
    <Cadre>
      <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--surface-raised)" vertical={false} />
        {axeTemps(debut - demiJour, fin + demiJour)}
        <YAxis {...AXE} width={44} tickFormatter={(v: number) => format(v)} />
        <Tooltip
          {...INFOBULLE}
          cursor={{ fill: 'var(--surface-raised)' }}
          labelFormatter={libelleDate}
          formatter={(v) => [`${format(Number(v))} ${unite}`]}
        />
        {reference !== undefined && (
          <ReferenceLine y={reference} stroke="var(--serie-objectif)" strokeDasharray="5 5" ifOverflow="extendDomain" />
        )}
        <Bar dataKey="valeur" fill={couleur} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
      </BarChart>
    </Cadre>
  )
}

export function GraphiqueCategories({
  points,
  couleur,
  format,
  infobulle,
}: {
  points: { libelle: string; valeur: number; detail: string }[]
  couleur: string
  format: (v: number) => string
  infobulle: (p: { libelle: string; valeur: number; detail: string }) => string
}) {
  return (
    <Cadre>
      <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--surface-raised)" vertical={false} />
        <XAxis {...AXE} dataKey="libelle" interval="preserveStartEnd" />
        <YAxis {...AXE} width={36} tickFormatter={(v: number) => format(v)} allowDecimals={false} />
        <Tooltip
          {...INFOBULLE}
          cursor={{ fill: 'var(--surface-raised)' }}
          formatter={(_v, _n, item) => [infobulle(item.payload as { libelle: string; valeur: number; detail: string })]}
        />
        <Bar dataKey="valeur" fill={couleur} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </Cadre>
  )
}

export function GraphiqueLigne({
  points,
  couleur,
  unite,
  format,
  debut,
  fin,
}: {
  points: PointJour[]
  couleur: string
  unite: string
  format: (v: number) => string
  debut: number
  fin: number
}) {
  return (
    <Cadre>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--surface-raised)" vertical={false} />
        {axeTemps(debut, fin)}
        <YAxis {...AXE} width={52} tickFormatter={(v: number) => format(v)} />
        <Tooltip {...INFOBULLE} labelFormatter={libelleDate} formatter={(v) => [`${format(Number(v))} ${unite}`]} />
        <Line dataKey="valeur" stroke={couleur} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </Cadre>
  )
}
