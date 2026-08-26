import {
  benefitValueAvailable, benefitValueCaptured, benefits, enrollments, money,
} from '../lib/data';

export default function BenefitsPage() {
  const trackedValue = benefitValueCaptured + benefitValueAvailable;
  const capturedShare = trackedValue ? Math.round((benefitValueCaptured / trackedValue) * 100) : 0;

  return (
    <main className="app-page">
      <header className="app-page-header">
        <h1>Benefits</h1>
      </header>

      <section className="benefit-value-summary" aria-label="Benefit value overview">
        <article className="surface captured-value"><span>Used YTD</span><strong>{money.format(benefitValueCaptured)}</strong><small>Credits recognized on statements</small></article>
        <article className="surface available-value"><span>Left to use</span><strong>{money.format(benefitValueAvailable)}</strong><small>Known value still available</small></article>
        <article className="surface"><span>Share used</span><strong>{capturedShare}%</strong><small>Of {money.format(trackedValue)} tracked value</small></article>
      </section>

      <section className="surface benefit-list-surface">
        <div className="surface-heading"><h2>Benefit usage</h2></div>
        <div className="benefit-list">
          {benefits.map((benefit, index) => (
            <article className={`benefit-list-row ${benefit.tone}`} key={`${benefit.card}-${benefit.title}`}>
              <span className="benefit-list-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="benefit-list-main">
                <div><h2>{benefit.title}</h2><span className={`benefit-card-tag ${benefit.card.toLowerCase()}`}>{benefit.card}</span></div>
                <p>{benefit.text}</p>
              </div>
              <div className="benefit-list-metric used"><small>Used YTD</small><strong>{money.format(benefit.used)}</strong></div>
              <div className="benefit-list-metric left"><small>Left</small><strong>{benefit.leftLabel}</strong></div>
              <div className="benefit-list-deadline"><small>Deadline</small><strong>{benefit.timing}</strong></div>
              <span className="benefit-list-state">{benefit.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="surface setup-surface">
        <div className="surface-heading"><h2>Benefits to enroll</h2></div>
        <div className="setup-list">
          {enrollments.map(([name, source]) => <div key={name}><span>○</span><strong>{name}</strong><small>{source}</small></div>)}
        </div>
      </section>
    </main>
  );
}
