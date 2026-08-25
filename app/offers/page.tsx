import { offers } from '../lib/data';

export default function OffersPage() {
  return (
    <main className="app-page">
      <header className="app-page-header">
        <div><span className="page-kicker">Offers</span><h1>Only the ones that fit.</h1><p>An offer is useful only when it overlaps with a purchase you already planned.</p></div>
      </header>

      <section className="offer-app-grid">
        {offers.map((offer) => (
          <article className="surface offer-app-card" key={offer.title}>
            <div className="offer-app-top"><span>{offer.label}</span><small className={`fit-${offer.fit.toLowerCase().replace(' ', '-')}`}>{offer.fit}</small></div>
            <h2>{offer.title}</h2>
            <p>{offer.text}</p>
            <footer><span>{offer.action}</span><b>›</b></footer>
          </article>
        ))}
      </section>

      <section className="surface principle-card">
        <span>Rule of thumb</span><h2>Never spend $100 to save $20.</h2>
        <p>Start with purchases already on your calendar, then check whether an AMEX Offer lowers the cost.</p>
      </section>
    </main>
  );
}
