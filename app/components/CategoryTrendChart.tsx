'use client';

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
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
  const firstMonth = String(data[0]?.month ?? '');
  const lastMonth = String(data.at(-1)?.month ?? '');
  const range = firstMonth && lastMonth
    ? `${new Date(`${firstMonth}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short' })}–${new Date(`${lastMonth}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : 'Monthly';

  return (
    <section className="surface category-trend-surface" aria-label="Monthly spending mix by category">
      <div className="surface-heading"><h2>Monthly spend mix</h2><small>Eligible purchases · {range}</small></div>
      <div className="category-trend-legend" aria-label="Chart legend">
        {series.map((name, index) => (
          <span key={name}><i style={{ backgroundColor: palette[index % palette.length] }} />{name}</span>
        ))}
      </div>
      <div className="category-trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 18, bottom: 2, left: 4 }} barCategoryGap="32%" accessibilityLayer>
            <CartesianGrid vertical={false} stroke="#e8ebea" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#7d888e', fontSize: 9 }} dy={7} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7d888e', fontSize: 9 }} tickFormatter={axisMoney} width={46} />
            <Tooltip
              formatter={(value, name) => [tooltipMoney.format(Number(value ?? 0)), String(name ?? '')]}
              itemSorter={(item) => -Number(item.value ?? 0)}
              contentStyle={{ border: '1px solid rgba(13,33,48,.1)', borderRadius: 10, boxShadow: '0 10px 30px rgba(13,33,48,.12)', fontSize: 10 }}
              labelStyle={{ color: '#0d2130', fontWeight: 700, marginBottom: 5 }}
              cursor={{ fill: 'rgba(13,33,48,.035)' }}
              isAnimationActive={false}
            />
            {series.map((name, index) => (
              <Bar
                key={name}
                dataKey={name}
                name={name}
                stackId="category"
                fill={palette[index % palette.length]}
                fillOpacity={index < 5 ? 1 : .78}
                maxBarSize={52}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
