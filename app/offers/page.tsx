import {
  activeOffers, money, offerSavingsYTD, preciseMoney, redeemedOffers,
} from '../lib/data';

const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

function displayDate(date: string) {
  if (!date) return '—';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function OffersPage() {
  return (
    <main className="app-page">
      <header className="app-page-header">
        <h1>Offers</h1>
      </header>

      <section className="offer-value-summary" aria-label="Offer value overview">
        <article className="surface saved-value"><span>Saved YTD</span><strong>{money.format(offerSavingsYTD)}</strong></article>
        <article className="surface"><span>Offers redeemed</span><strong>{redeemedOffers.length}</strong></article>
      </section>

      <section className="surface offer-list-surface">
        <div className="surface-heading"><h2>Active offers</h2></div>
        <div className="offer-list">
          {activeOffers.map((offer, index) => (
            <article className="offer-list-row" key={`${offer.card}-${offer.title}`}>
              <span className="offer-list-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="offer-list-main">
                <div><h2>{offer.title}</h2><span className={`card-tag ${offer.card.toLowerCase()}`}>{offer.card}</span></div>
                <p><strong>{offer.requirement}</strong><span> · {offer.text}</span></p>
              </div>
              <div className="offer-list-metric value"><small>Value</small><strong>{offer.valueLabel}</strong></div>
              <div className="offer-list-metric status"><small>Status</small><strong>{offer.status}</strong></div>
              <span className={`status-pill fit-${offer.fit.toLowerCase().replace(' ', '-')}`}>{offer.fit}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="surface offer-list-surface redeemed-offers">
        <div className="surface-heading"><h2>Redeemed offers</h2></div>
        <div className="offer-list">
          {redeemedOffers.map((offer, index) => (
            <article className="offer-list-row redeemed" key={`${offer.card}-${offer.title}`}>
              <span className="offer-list-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="offer-list-main">
                <div><h2>{offer.title}</h2><span className={`card-tag ${offer.card.toLowerCase()}`}>{offer.card}</span></div>
                <p>{preciseMoney.format(offer.qualifyingSpend)} in qualifying purchases</p>
              </div>
              <div className="offer-list-metric redeemed-date"><small>Redeemed</small><strong>{displayDate(offer.redeemedDate)}</strong></div>
              <div className="offer-list-metric saved"><small>Cash back</small><strong>{money.format(offer.cashBack)}</strong></div>
              <div className="offer-list-metric rate"><small>Savings rate</small><strong>{percent.format(offer.savingsRate)}</strong></div>
              <span className="status-pill">Redeemed</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
