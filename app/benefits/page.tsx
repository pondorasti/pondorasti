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
        <article className="surface captured-value"><span>Credits received</span><strong>{money.format(benefitValueCaptured)}</strong><small>Recognized on statements this year</small></article>
        <article className="surface available-value"><span>Still available</span><strong>{money.format(benefitValueAvailable)}</strong><small>Known value before upcoming deadlines</small></article>
        <article className="surface"><span>Value captured</span><strong>{capturedShare}%</strong><small>Of {money.format(trackedValue)} tracked value</small></article>
      </section>

      <section className="surface benefit-list-surface">
        <div className="surface-heading"><h2>Gold + Platinum benefits</h2></div>
        <div className="benefit-list">
          {benefits.map((benefit, index) => (
            <article className={`benefit-list-row ${benefit.tone}`} key={`${benefit.card}-${benefit.title}`}>
              <span className="benefit-list-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="benefit-list-main">
                <div><h2>{benefit.title}</h2><span className={`benefit-card-tag ${benefit.card.toLowerCase()}`}>{benefit.card}</span></div>
                <p>{benefit.text}</p>
              </div>
              <div className="benefit-list-value"><strong>{benefit.amount}</strong><small>{benefit.timing}</small></div>
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
