'use client';

import { useMemo, useState } from 'react';
import analysis from './amex-analysis.json';

type Transaction = {
  date: string;
  card: 'Gold' | 'Platinum';
  description: string;
  amount: number;
  transaction_type: string;
  category: string;
  reward_category?: string;
  parent_category?: string | null;
  copilot_name?: string | null;
  reward_eligible: string;
};

const transactions = analysis.transactions as Transaction[];

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const preciseMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const categoryIcons: Record<string, string> = {
  Restaurants: '🍽️',
  Groceries: '🛒',
  'Travel & Vacation': '🏖️',
  Transportation: '🚇',
  Shops: '🛍️',
  Transit: '🚇',
  Subscriptions: '📺',
  Healthcare: '🩺',
  'Personal Care': '💆',
  Entertainment: '🎭',
  Services: '🛠️',
  Other: '📦',
};

const benefits = [
  {
    timing: 'By Aug 31',
    title: 'Gold dining credit',
    amount: '$10',
    text: 'Use at an eligible partner before the monthly credit resets.',
    tone: 'gold',
  },
  {
    timing: 'By Aug 31',
    title: 'Platinum digital entertainment',
    amount: '$10',
    text: 'About $10 remained available for August at review time.',
    tone: 'platinum',
  },
  {
    timing: 'By Sep 30',
    title: 'Platinum Resy + lululemon',
    amount: '$134',
    text: '$100 quarterly Resy credit plus about $34 at lululemon.',
    tone: 'platinum',
  },
  {
    timing: 'By Dec 31',
    title: 'Gold Resy credit',
    amount: '$50',
    text: 'Second-half dining credit at participating Resy restaurants.',
    tone: 'gold',
  },
  {
    timing: 'By Dec 31',
    title: 'Platinum hotel + airline',
    amount: '$500',
    text: '$300 prepaid hotel credit plus $200 airline incidental credit.',
    tone: 'platinum',
  },
  {
    timing: 'At renewal',
    title: 'CLEAR+ renewal',
    amount: 'Covered',
    text: 'Already active. Keep Platinum as the payment card when it renews.',
    tone: 'clear',
  },
  {
    timing: 'Personal preference',
    title: 'Dunkin’ credit',
    amount: '$0 value',
    text: 'Not part of your routine. Ignore it instead of manufacturing spend.',
    tone: 'muted',
  },
];

const offers = [
  {
    label: 'Available · Platinum',
    title: '$200 back on Lufthansa',
    text: 'Spend $1,000 through Amex Travel. Your YTD Lufthansa activity was close to the threshold.',
    action: 'Check before the next booking',
  },
  {
    label: 'Added · Gold',
    title: '$150 back at Function Health',
    text: 'Spend $799. You already showed some Function Health spend, so this one may fit naturally.',
    action: 'Only pursue planned care',
  },
  {
    label: 'Added · Platinum',
    title: '$40 back on Airbnb',
    text: 'Spend $80 or more. Easy to use if an eligible stay is already planned.',
    action: 'Use Platinum at checkout',
  },
  {
    label: 'Available · Amazon',
    title: 'Pay with Points promotion',
    text: 'A large Amazon spend base makes the offer relevant, but the implied point value is only about 1.08¢.',
    action: 'Use only for the discount',
  },
  {
    label: 'Skip duplicate',
    title: 'Annual Uber One credit',
    text: 'Platinum already earned the annual credit. Avoid triggering a second overlapping membership benefit on Gold.',
    action: 'Keep one membership',
  },
];

const enrollments = [
  ['Hilton Honors Gold', 'Platinum'],
  ["Hertz President’s Circle", 'Platinum'],
  ['Hertz Five Star', 'Gold'],
  ['Leaders Club Sterling', 'Optional'],
];

function multiplier(card: Transaction['card'], category: string) {
  if (category === 'Flights') return card === 'Platinum' ? 5 : 3;
  if (card === 'Gold' && (category === 'Dining' || category === 'Groceries')) return 4;
  return 1;
}

function bestMultiplier(category: string) {
  if (category === 'Flights') return 5;
  if (category === 'Dining' || category === 'Groceries') return 4;
  return 1;
}

function friendlyMerchant(description: string) {
  if (description.includes('WHOLE FOODS')) return 'Whole Foods';
  if (description.includes('UBER EATS')) return 'Uber Eats';
  if (description.includes('COOKUNITY')) return 'CookUnity';
  if (description.includes('MAHJONG MAMI')) return 'Mahjong Mami';
  return description.split(/\s{2,}/)[0].trim();
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [card, setCard] = useState('All cards');
  const [category, setCategory] = useState('All categories');

  const eligible = useMemo(
    () => transactions.filter((item) => item.reward_eligible === 'Yes' && item.amount > 0),
    [],
  );

  const misroutedTransactions = useMemo(
    () =>
      eligible
        .filter(
          (item) =>
            item.card === 'Platinum' &&
            (item.reward_category === 'Dining' || item.reward_category === 'Groceries'),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [eligible],
  );

  const metrics = useMemo(() => {
    const spend = eligible.reduce((sum, item) => sum + item.amount, 0);
    const current = eligible.reduce(
      (sum, item) => sum + item.amount * multiplier(item.card, item.reward_category ?? item.category),
      0,
    );
    const optimized = eligible.reduce(
      (sum, item) => sum + item.amount * bestMultiplier(item.reward_category ?? item.category),
      0,
    );
    const misrouted = misroutedTransactions.reduce((sum, item) => sum + item.amount, 0);
    return { spend, current, optimized, missed: optimized - current, misrouted };
  }, [eligible, misroutedTransactions]);

  const categories = useMemo(() => {
    const totals = new Map<string, { spend: number; current: number; optimized: number }>();
    for (const item of eligible) {
      const row = totals.get(item.category) ?? { spend: 0, current: 0, optimized: 0 };
      row.spend += item.amount;
      row.current += item.amount * multiplier(item.card, item.reward_category ?? item.category);
      row.optimized += item.amount * bestMultiplier(item.reward_category ?? item.category);
      totals.set(item.category, row);
    }
    return [...totals.entries()]
      .map(([name, values]) => ({ name, ...values, missed: values.optimized - values.current }))
      .sort((a, b) => b.spend - a.spend);
  }, [eligible]);

  const filteredTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesQuery = !normalized || item.description.toLowerCase().includes(normalized);
      const matchesCard = card === 'All cards' || item.card === card;
      const matchesCategory = category === 'All categories' || item.category === category;
      return matchesQuery && matchesCard && matchesCategory;
    });
  }, [query, card, category]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AMEX Card Playbook home">
          <span className="brand-mark">A</span>
          <span>Card Playbook</span>
        </a>
        <nav aria-label="Dashboard sections">
          <a href="#routing">Card routing</a>
          <a href="#benefits">Benefits</a>
          <a href="#offers">Offers</a>
          <a href="#transactions">Transactions</a>
        </nav>
        <span className="privacy-pill"><i /> Private dashboard</span>
      </header>

      <section className="dashboard-header" id="top">
        <div className="section-shell dashboard-header-inner">
          <div>
            <span className="eyebrow">Portfolio overview</span>
            <h1>AMEX Card Playbook</h1>
            <p>Gold + Platinum · Jan 1–Aug 24, 2026 · 556 transactions</p>
          </div>
          <div className="dashboard-meta">
            <span>Reporting period</span>
            <strong>2026 year to date</strong>
            <small>Updated Aug 24</small>
          </div>
        </div>
      </section>

      <section className="metric-grid section-shell" aria-label="Year-to-date overview">
        <article className="metric-card primary">
          <span>Eligible spend</span>
          <strong>{money.format(metrics.spend)}</strong>
          <small>Across Gold + Platinum</small>
        </article>
        <article className="metric-card">
          <span>Estimated points earned</span>
          <strong>{number.format(metrics.current)}</strong>
          <small>Based on category multipliers</small>
        </article>
        <article className="metric-card">
          <span>Optimized potential</span>
          <strong>{number.format(metrics.optimized)}</strong>
          <small>If the better card was used</small>
        </article>
        <article className="metric-card accent">
          <span>Points left on table</span>
          <strong>{number.format(metrics.missed)}</strong>
          <small>Worth about {preciseMoney.format(metrics.missed * 0.015)} at 1.5¢/point</small>
        </article>
      </section>

      <section className="section-shell section" id="routing">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">THE DEFAULT ROUTING RULE</span>
            <h2>Two cards. Clear jobs.</h2>
          </div>
          <p>Use category bonuses first. Offers and credits are deliberate exceptions.</p>
        </div>

        <div className="card-routing-grid">
          <article className="card-profile gold-card">
            <div className="card-topline"><span>AMEX</span><i>GOLD</i></div>
            <h3>Gold is your food card.</h3>
            <div className="route-list">
              <div><strong>4×</strong><span>Restaurants worldwide</span></div>
              <div><strong>4×</strong><span>U.S. supermarkets</span></div>
              <div><strong>3×</strong><span>Flights booked direct or with Amex Travel</span></div>
              <div className="muted-route"><strong>1×</strong><span>Most other purchases</span></div>
            </div>
            <p className="card-rule">Keep it top-of-wallet for food, not general spend.</p>
          </article>

          <article className="card-profile platinum-card">
            <div className="card-topline"><span>AMEX</span><i>PLATINUM</i></div>
            <h3>Platinum is your travel + benefits card.</h3>
            <div className="route-list">
              <div><strong>5×</strong><span>Flights booked direct or with Amex Travel</span></div>
              <div><strong>5×</strong><span>Eligible prepaid hotels through Amex Travel</span></div>
              <div><strong>★</strong><span>Credits, lounge access, and targeted offers</span></div>
              <div className="muted-route"><strong>1×</strong><span>Most other purchases</span></div>
            </div>
            <p className="card-rule">Use for travel, benefits, and an offer—not everyday dining.</p>
          </article>
        </div>

        <div className="callout-grid single">
          <article className="callout warning">
            <span className="callout-icon">!</span>
            <div>
              <small>ROUTING CORRECTION</small>
              <h3>{preciseMoney.format(metrics.misrouted)} of likely food spend hit Platinum</h3>
              <p>That spend could have earned 4× on Gold instead of 1×. Move restaurant and grocery purchases to Gold by default.</p>
            </div>
          </article>
        </div>
        <div className="routing-detail">
          <div className="routing-detail-header">
            <div>
              <span className="eyebrow">Transactions to move to Gold</span>
              <h3>{misroutedTransactions.length} purchases found</h3>
            </div>
            <div className="routing-total">
              <small>Recoverable points</small>
              <strong>+{number.format(metrics.missed)}</strong>
            </div>
          </div>
          <div className="routing-list">
            <div className="routing-list-head">
              <span>Date</span><span>Merchant</span><span>Category</span><span>Amount</span><span>Better card</span><span>Extra points</span>
            </div>
            {misroutedTransactions.map((item, index) => (
              <div className="routing-list-row" key={`${item.date}-${item.description}-${index}`}>
                <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <strong>{item.copilot_name ?? friendlyMerchant(item.description)}</strong>
                <span>{item.category}</span>
                <span>{preciseMoney.format(item.amount)}</span>
                <span className="card-swap"><i>Platinum</i><b>→</b><i>Gold</i></span>
                <span className="points-gain">+{number.format(item.amount * 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell section categories-section">
        <div className="section-heading">
          <span className="eyebrow">WHERE THE SPEND WENT</span>
          <h2>Category performance</h2>
          <p>Copilot Money categories, with AMEX earning rules preserved for points analysis.</p>
        </div>
        <div className="category-table">
          <div className="category-head"><span>Category</span><span>Eligible spend</span><span>Share</span><span>Missed points</span></div>
          {categories.map((item) => (
            <div className="category-row" key={item.name}>
              <span className="category-name"><i>{categoryIcons[item.name] ?? '📦'}</i>{item.name}</span>
              <strong>{preciseMoney.format(item.spend)}</strong>
              <span className="share-cell">
                <span className="bar-track"><i style={{ width: `${(item.spend / metrics.spend) * 100}%` }} /></span>
                <small>{((item.spend / metrics.spend) * 100).toFixed(1)}%</small>
              </span>
              <span className={item.missed > 0 ? 'missed' : ''}>{item.missed > 0 ? `+${number.format(item.missed)}` : '—'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="benefit-band section" id="benefits">
        <div className="section-shell">
          <div className="section-heading light split-heading">
            <div>
              <span className="eyebrow">USE IT OR LOSE IT</span>
              <h2>Your benefit calendar</h2>
            </div>
            <p>Prioritized by the next reset date—not by the advertised value.</p>
          </div>
          <div className="benefit-grid">
            {benefits.map((benefit) => (
              <article className={`benefit-card ${benefit.tone}`} key={benefit.title}>
                <span className="benefit-timing">{benefit.timing}</span>
                <h3>{benefit.title}</h3>
                <strong>{benefit.amount}</strong>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
          <div className="enrollment-panel">
            <div>
              <span className="eyebrow">ONE-TIME SETUP</span>
              <h3>Enroll once. Keep the status.</h3>
              <p>These benefits appeared available but not yet enrolled.</p>
            </div>
            <div className="enrollment-list">
              {enrollments.map(([name, source]) => (
                <div key={name}><span>○</span><strong>{name}</strong><small>{source}</small></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell section" id="offers">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">PERSONALIZED OFFERS</span>
            <h2>Worth a look—not a reason to spend.</h2>
          </div>
          <p>Only use an offer when it overlaps with a purchase you already planned.</p>
        </div>
        <div className="offer-grid">
          {offers.map((offer) => (
            <article key={offer.title}>
              <span>{offer.label}</span>
              <h3>{offer.title}</h3>
              <p>{offer.text}</p>
              <small>{offer.action} <b>→</b></small>
            </article>
          ))}
        </div>
      </section>

      <section className="transactions-band section" id="transactions">
        <div className="section-shell">
          <div className="section-heading split-heading">
            <div>
              <span className="eyebrow">THE SOURCE DATA</span>
              <h2>Transaction explorer</h2>
            </div>
            <p>{filteredTransactions.length} of {transactions.length} transactions match</p>
          </div>
          <div className="filters">
            <label className="search-field">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant" aria-label="Search merchant" />
            </label>
            <select value={card} onChange={(event) => setCard(event.target.value)} aria-label="Filter by card">
              <option>All cards</option><option>Gold</option><option>Platinum</option>
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
              <option>All categories</option>
              {[...new Set(transactions.map((item) => item.category))].sort().map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="transaction-table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Merchant</th><th>Card</th><th>Category</th><th>Amount</th><th>Points</th></tr></thead>
              <tbody>
                {filteredTransactions.slice(0, 80).map((item, index) => (
                  <tr key={`${item.date}-${item.description}-${index}`}>
                    <td>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td><strong>{item.copilot_name ?? item.description}</strong><small>{item.transaction_type}</small></td>
                    <td><span className={`card-tag ${item.card.toLowerCase()}`}>{item.card}</span></td>
                    <td>{item.category}</td>
                    <td className={item.amount < 0 ? 'credit-amount' : ''}>{preciseMoney.format(item.amount)}</td>
                    <td>{item.reward_eligible === 'Yes' && item.amount > 0 ? `${multiplier(item.card, item.reward_category ?? item.category)}×` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length > 80 && <p className="table-note">Showing the first 80 matching transactions. Refine the filters to narrow the list.</p>}
            {filteredTransactions.length === 0 && <p className="empty-state">No transactions match those filters.</p>}
          </div>
        </div>
      </section>

      <section className="section-shell guardrails">
        <span className="eyebrow">THE THREE RULES</span>
        <div className="rule-grid">
          <article><b>01</b><h3>Use Gold for food.</h3><p>Restaurants and U.S. supermarkets are the biggest repeatable earning edge.</p></article>
          <article><b>02</b><h3>Use Platinum with a reason.</h3><p>Flights, eligible prepaid hotels, a credit, or a strong offer—not because it feels premium.</p></article>
          <article><b>03</b><h3>Value benefits personally.</h3><p>CLEAR+ counts because you use it. Dunkin’ does not. Your real value beats the brochure.</p></article>
        </div>
      </section>

      <footer>
        <div className="section-shell">
          <span>AMEX Card Playbook · Private planning dashboard</span>
          <p>Estimates use transaction categories and standard card earning rules. Confirm offer terms, enrollment, and merchant eligibility in your AMEX account before acting.</p>
        </div>
      </footer>
    </main>
  );
}
