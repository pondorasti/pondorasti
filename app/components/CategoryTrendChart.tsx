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

const palette = [
  '#007aff', '#d49a21', '#e4573d', '#38a169', '#7c5ce7', '#24a7a2',
  '#d16b9b', '#7a8791', '#9b6a3c', '#5e80b8', '#a2a930', '#6f7780',
];

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
            <CartesianGrid vertical={false} stroke="#e8ebea" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#7d888e', fontSize: 9 }} dy={7} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7d888e', fontSize: 9 }} tickFormatter={axisMoney} width={46} />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              formatter={(value, name) => [tooltipMoney.format(Number(value ?? 0)), String(name ?? '')]}
              itemSorter={(item) => -Number(item.value ?? 0)}
              contentStyle={{ border: '1px solid rgba(13,33,48,.1)', borderRadius: 10, boxShadow: '0 10px 30px rgba(13,33,48,.12)', fontSize: 10 }}
              labelStyle={{ color: '#0d2130', fontWeight: 700, marginBottom: 5 }}
              wrapperStyle={{ zIndex: 20 }}
              cursor={{ stroke: '#aeb7bb', strokeDasharray: '3 3' }}
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
