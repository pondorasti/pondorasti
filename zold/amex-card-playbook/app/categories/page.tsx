import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import CategoryTrendChart from '../components/CategoryTrendChart';
import {
  categories, categoryMonthlySpend, categorySlug, money, number,
} from '../lib/data';

export default function CategoriesPage() {
  return (
    <main className="app-page">
      <header className="app-page-header">
        <h1>Categories</h1>
      </header>

      <CategoryTrendChart
        data={categoryMonthlySpend}
        series={categories.map((category) => category.name)}
      />

      <section className="surface category-table">
        <div className="category-table-head" aria-hidden="true">
          <span>Category</span><span>Eligible spend</span><span>Share</span><span>Transactions</span><span>Missed points</span><span />
        </div>
        {categories.map((category) => (
          <Link className="category-table-row" href={`/categories/${categorySlug(category.name)}`} key={category.name}>
            <span className="category-name-cell"><i>{category.icon}</i><strong>{category.name}</strong></span>
            <b className="category-spend-cell">{money.format(category.spend)}</b>
            <span className="category-share-cell"><b>{(category.share * 100).toFixed(1)}%</b><i><span style={{ width: `${category.share * 100}%` }} /></i></span>
            <span className="category-count-cell">{category.count}</span>
            <span className={category.missed ? 'category-missed-cell has-missed' : 'category-missed-cell'}>{category.missed ? `+${number.format(category.missed)} pts` : '—'}</span>
            <em><HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} /></em>
          </Link>
        ))}
      </section>
    </main>
  );
}
