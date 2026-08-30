'use client';

import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import {
  categories, displayMerchant, multiplier, preciseMoney, rewardCategory, transactions,
} from '../lib/data';

export default function TransactionsExplorer() {
  const [query, setQuery] = useState('');
  const [card, setCard] = useState('All cards');
  const [category, setCategory] = useState('All categories');
  const [view, setView] = useState('all');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'misrouted') {
      setView('misrouted');
    }
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return transactions.filter((item) => {
      const merchant = displayMerchant(item).toLowerCase();
      const misrouted = item.reward_eligible === 'Yes' && item.amount > 0 && item.card === 'Platinum' && ['Dining', 'Groceries'].includes(rewardCategory(item));
      return (!normalized || merchant.includes(normalized)) &&
        (card === 'All cards' || item.card === card) &&
        (category === 'All categories' || item.category === category) &&
        (view === 'all' || misrouted);
    });
  }, [query, card, category, view]);

  const filteredSpend = filtered.filter((item) => item.amount > 0 && item.reward_eligible === 'Yes').reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <section className="transaction-toolbar surface">
        <div className="view-switch" aria-label="Transaction view">
          <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All transactions</button>
          <button className={view === 'misrouted' ? 'active' : ''} onClick={() => setView('misrouted')}>Use other card</button>
        </div>
        <div className="app-filters">
          <label><span><HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.8} /></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant" aria-label="Search merchant" /></label>
          <select value={card} onChange={(event) => setCard(event.target.value)} aria-label="Filter by card"><option>All cards</option><option>Gold</option><option>Platinum</option></select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option>All categories</option>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select>
        </div>
        <div className="filter-summary"><span>{filtered.length} transactions</span><span>{preciseMoney.format(filteredSpend)} eligible spend</span></div>
      </section>

      <section className="surface all-transactions-surface">
        <div className="transaction-app-table">
          <div className="transaction-app-row transaction-app-head"><span>Date</span><span>Merchant</span><span>Card</span><span>Category</span><span>Amount</span><span>Points</span><span>Recommendation</span></div>
          {filtered.map((item, index) => {
            const misrouted = item.reward_eligible === 'Yes' && item.amount > 0 && item.card === 'Platinum' && ['Dining', 'Groceries'].includes(rewardCategory(item));
            return (
              <div className={`transaction-app-row ${misrouted ? 'misrouted-row' : ''}`} key={`${item.date}-${item.description}-${index}`}>
                <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <strong>{displayMerchant(item)}<small>{item.transaction_type}</small></strong>
                <span><i className={`card-tag ${item.card.toLowerCase()}`}>{item.card}</i></span><span>{item.category}</span>
                <b className={item.amount < 0 ? 'credit-text' : ''}>{preciseMoney.format(item.amount)}</b>
                <span>{item.reward_eligible === 'Yes' && item.amount > 0 ? `${multiplier(item.card, rewardCategory(item))}×` : '—'}</span>
                <span>{misrouted ? <em>Use Gold · +{Math.round(item.amount * 3)} pts</em> : '—'}</span>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="app-empty">No transactions match these filters.</div>}
        </div>
      </section>
    </>
  );
}
