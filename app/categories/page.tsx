import Link from 'next/link';
import { categories, categorySlug, money, number } from '../lib/data';

export default function CategoriesPage() {
  return (
    <main className="app-page">
      <header className="app-page-header">
        <div><span className="page-kicker">Categories</span><h1>Where your money went.</h1><p>Copilot Money categories · click any category to see every transaction.</p></div>
        <span className="sync-chip"><i>✓</i> {categories.length} categories</span>
      </header>

      <section className="category-overview-grid">
        {categories.map((category) => (
          <Link className="surface category-app-card" href={`/categories/${categorySlug(category.name)}`} key={category.name}>
            <div className="category-card-top"><i>{category.icon}</i><span>{(category.share * 100).toFixed(1)}%</span></div>
            <h2>{category.name}</h2>
            <strong>{money.format(category.spend)}</strong>
            <div className="category-share-track"><i style={{ width: `${category.share * 100}%` }} /></div>
            <footer><span>{category.count} transactions</span><span className={category.missed ? 'has-missed' : ''}>{category.missed ? `+${number.format(category.missed)} pts` : 'Optimized'} <b>›</b></span></footer>
          </Link>
        ))}
      </section>
    </main>
  );
}
