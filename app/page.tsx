import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import {
  annualCardFees, benefits, categories, categorySlug, displayMerchant, metrics,
  misroutedTransactions, money, number, preciseMoney, totalCardValueYTD,
} from './lib/data';

export default function OverviewPage() {
  return (
    <main className="app-page">
      <header className="app-page-header">
        <h1>Overview</h1>
      </header>

      <section className="app-metrics" aria-label="Year-to-date card performance">
        <article className="app-metric hero-metric">
          <span>Eligible spend</span><strong>{money.format(metrics.spend)}</strong>
        </article>
        <article className="app-metric">
          <span>Points earned</span><strong>{number.format(metrics.current)}</strong>
        </article>
        <article className="app-metric">
          <span>Optimized potential</span><strong>{number.format(metrics.optimized)}</strong>
        </article>
        <article className="app-metric warning-metric">
          <span>Recoverable points</span><strong>{number.format(metrics.missed)}</strong>
        </article>
        <article className="app-metric fee-metric" title="Platinum $895 + Gold $325">
          <span>Annual fees</span><strong>{money.format(annualCardFees.total)}</strong>
        </article>
        <article className="app-metric value-metric" title="Benefits used + redeemed offers + points valued at 1.5¢ each">
          <span>Value captured YTD</span><strong>{money.format(totalCardValueYTD)}</strong>
        </article>
      </section>

      <section className="overview-grid">
        <article className="surface card-guide gold-guide">
          <div className="surface-title"><span>Gold</span><small>Everyday card</small></div>
          <h2>Food goes here.</h2>
          <div className="mini-rules"><span><b>4×</b> Restaurants</span><span><b>4×</b> U.S. groceries</span><span><b>3×</b> Flights</span></div>
        </article>
        <article className="surface card-guide platinum-guide">
          <div className="surface-title"><span>Platinum</span><small>Travel + benefits</small></div>
          <h2>Use it with a reason.</h2>
          <div className="mini-rules"><span><b>5×</b> Flights</span><span><b>5×</b> Amex Travel hotels</span><span><b>★</b> Credits + offers</span></div>
        </article>
        <article className="surface priority-card">
          <div className="surface-title"><span>Needs attention</span><small>{misroutedTransactions.length} purchases</small></div>
          <strong>{preciseMoney.format(metrics.misrouted)}</strong>
          <p>Food purchases hit Platinum instead of earning 4× on Gold.</p>
          <Link href="/transactions?view=misrouted">Review transactions <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={1.9} /></Link>
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="surface data-surface">
          <div className="surface-heading">
            <h2>Top categories</h2>
            <Link href="/categories">View all</Link>
          </div>
          <div className="compact-category-list">
            {categories.slice(0, 6).map((category) => (
              <Link href={`/categories/${categorySlug(category.name)}`} key={category.name}>
                <i>{category.icon}</i>
                <span><strong>{category.name}</strong><small>{category.count} transactions</small></span>
                <span className="mini-share"><i style={{ width: `${category.share * 100}%` }} /></span>
                <b>{money.format(category.spend)}</b>
                <em><HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={1.8} /></em>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface data-surface">
          <div className="surface-heading">
            <h2>Benefit deadlines</h2>
            <Link href="/benefits">View all</Link>
          </div>
          <div className="deadline-list">
            {benefits.slice(0, 4).map((benefit) => (
              <div key={benefit.title}>
                <span className={`benefit-dot ${benefit.tone}`} />
                <span><strong>{benefit.title}</strong><small>{benefit.timing}</small></span>
                <b>{benefit.leftLabel}</b>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="surface data-surface recent-routing">
        <div className="surface-heading">
          <h2>Use Gold next time</h2>
          <Link href="/transactions?view=misrouted">See all {misroutedTransactions.length}</Link>
        </div>
        <div className="app-table">
          <div className="app-table-head"><span>Merchant</span><span>Category</span><span>Date</span><span>Amount</span><span>Extra points</span></div>
          {misroutedTransactions.slice(0, 5).map((item, index) => (
            <div className="app-table-row" key={`${item.date}-${item.description}-${index}`}>
              <strong>{displayMerchant(item)}</strong><span>{item.category}</span>
              <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>{preciseMoney.format(item.amount)}</span><b>+{number.format(item.amount * 3)}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
