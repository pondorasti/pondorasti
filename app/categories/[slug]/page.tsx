import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  categories, categorySlug, displayMerchant, money, number, preciseMoney, transactions,
} from '../../lib/data';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categories.map((category) => ({ slug: categorySlug(category.name) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) return {};
  const title = `${category.name} · AMEX Card Playbook`;
  const description = `${category.count} ${category.name} transactions totaling ${money.format(category.spend)}.`;
  return { title, description, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const rows = transactions.filter((item) => item.category === category.name).sort((a, b) => b.date.localeCompare(a.date));
  const eligibleRows = rows.filter((item) => item.reward_eligible === 'Yes' && item.amount > 0);
  const goldSpend = eligibleRows.filter((item) => item.card === 'Gold').reduce((sum, item) => sum + item.amount, 0);
  const platinumSpend = eligibleRows.filter((item) => item.card === 'Platinum').reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="app-page">
      <header className="app-page-header">
        <h1>{category.name}</h1>
      </header>
      <Link className="back-link" href="/categories">‹ All categories</Link>
      <section className="detail-metrics">
        <article className="surface"><span>Eligible spend</span><strong>{money.format(category.spend)}</strong><small>{(category.share * 100).toFixed(1)}% of eligible spend</small></article>
        <article className="surface"><span>Gold</span><strong>{money.format(goldSpend)}</strong><small>Purchases on Gold</small></article>
        <article className="surface"><span>Platinum</span><strong>{money.format(platinumSpend)}</strong><small>Purchases on Platinum</small></article>
        <article className="surface"><span>Missed points</span><strong className={category.missed ? 'warn-text' : ''}>{number.format(category.missed)}</strong><small>{category.missed ? 'Recoverable with better routing' : 'Already optimized'}</small></article>
      </section>
      <section className="surface category-transaction-surface">
        <div className="surface-heading"><div><span className="page-kicker">All activity</span><h2>{rows.length} transactions</h2></div></div>
        <div className="detail-transaction-table">
          <div className="detail-row detail-head"><span>Date</span><span>Merchant</span><span>Card</span><span>Type</span><span>Amount</span></div>
          {rows.map((item, index) => (
            <div className="detail-row" key={`${item.date}-${item.description}-${index}`}>
              <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <strong>{displayMerchant(item)}</strong><span><i className={`small-card ${item.card.toLowerCase()}`}>{item.card}</i></span>
              <span>{item.transaction_type}</span><b className={item.amount < 0 ? 'credit-text' : ''}>{preciseMoney.format(item.amount)}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
