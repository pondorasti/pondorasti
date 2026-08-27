'use client';

import { useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

type ChartDatum = Record<string, string | number>;

type Props = {
  data: ChartDatum[];
  series: string[];
};

const palette = Array.from({ length: 12 }, (_, index) => `var(--chart-${index + 1})`);

const tooltipMoney = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});

function axisMoney(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `$${value}`;
}

export default function CategoryTrendChart({ data, series }: Props) {
  const [highlightedSeries, setHighlightedSeries] = useState<string | null>(null);

  return (
    <section className="surface category-trend-surface" aria-label="Monthly spending mix by category">
      <div className="surface-heading"><h2>Monthly spend mix</h2></div>
      <div className="category-trend-legend" aria-label="Chart legend">
        {series.map((name, index) => (
          <button
            type="button"
            className={highlightedSeries && highlightedSeries !== name ? 'dimmed' : ''}
            aria-label={`Highlight ${name}`}
            key={name}
            onMouseEnter={() => setHighlightedSeries(name)}
            onMouseLeave={() => setHighlightedSeries(null)}
            onFocus={() => setHighlightedSeries(name)}
            onBlur={() => setHighlightedSeries(null)}
          >
            <i style={{ backgroundColor: palette[index % palette.length] }} />{name}
          </button>
        ))}
      </div>
      <div className="category-trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 18, bottom: 2, left: 4 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} dy={7} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} tickFormatter={axisMoney} width={46} />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              formatter={(value, name) => [tooltipMoney.format(Number(value ?? 0)), String(name ?? '')]}
              itemSorter={(item) => -Number(item.value ?? 0)}
              contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--separator)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0, 0, 0, .18)', fontSize: 12 }}
              labelStyle={{ color: 'var(--text-1)', fontWeight: 590, marginBottom: 5 }}
              wrapperStyle={{ zIndex: 20 }}
              cursor={{ stroke: 'var(--chart-cursor)', strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />
            {series.map((name, index) => (
              <Area
                key={name}
                type="monotone"
                dataKey={name}
                name={name}
                stackId="category"
                fill={palette[index % palette.length]}
                stroke={palette[index % palette.length]}
                strokeWidth={1.5}
                fillOpacity={highlightedSeries ? (highlightedSeries === name ? .72 : .06) : (index < 5 ? .62 : .42)}
                strokeOpacity={highlightedSeries ? (highlightedSeries === name ? 1 : .12) : .92}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
