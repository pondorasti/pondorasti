import {
  accessBenefits, benefitValueAvailable, benefitValueCaptured,
  benefits, money, protectionBenefits,
} from '../lib/data';

export default function BenefitsPage() {
  return (
    <main className="app-page">
      <header className="app-page-header">
        <h1>Benefits</h1>
      </header>

      <section className="benefit-value-summary" aria-label="Benefit value overview">
        <article className="surface captured-value"><span>Used YTD</span><strong>{money.format(benefitValueCaptured)}</strong><small>Statements plus confirmed Uber Cash usage</small></article>
        <article className="surface available-value"><span>Left to use</span><strong>{money.format(benefitValueAvailable)}</strong><small>All confirmed available value through year-end</small></article>
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
              <div className="benefit-list-metric used"><small>Used YTD</small><strong>{benefit.usedLabel ?? money.format(benefit.used)}</strong></div>
              <div className="benefit-list-metric left"><small>Left</small><strong>{benefit.leftLabel}</strong></div>
              <div className="benefit-list-deadline"><small>Deadline</small><strong>{benefit.timing}</strong></div>
              <span className="benefit-list-state">{benefit.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="surface setup-surface">
        <div className="surface-heading"><h2>Access &amp; status</h2></div>
        <div className="setup-list">
          {accessBenefits.map((benefit) => <div key={benefit.name}><span>○</span><strong>{benefit.name}</strong><small>{benefit.card} · {benefit.status}</small></div>)}
        </div>
      </section>

      <section className="surface setup-surface">
        <div className="surface-heading"><h2>Included protections</h2></div>
        <div className="setup-list protection-list">
          {protectionBenefits.map((benefit) => <div key={benefit.name}><span>✓</span><strong>{benefit.name}</strong><small>{benefit.card}</small></div>)}
        </div>
      </section>
    </main>
  );
}
