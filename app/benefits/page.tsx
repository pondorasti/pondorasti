import { benefits, enrollments } from '../lib/data';

export default function BenefitsPage() {
  return (
    <main className="app-page">
      <header className="app-page-header">
        <h1>Benefits</h1>
      </header>

      <section className="benefit-summary">
        <article className="surface"><span>Use by Aug 31</span><strong>$20</strong><small>Dining + entertainment</small></article>
        <article className="surface"><span>Use by Sep 30</span><strong>$134</strong><small>Resy + lululemon</small></article>
        <article className="surface"><span>Use by Dec 31</span><strong>$550</strong><small>Gold Resy + Platinum travel</small></article>
        <article className="surface"><span>On autopilot</span><strong>CLEAR+</strong><small>Platinum at renewal</small></article>
      </section>

      <section className="benefits-app-grid">
        {benefits.map((benefit) => (
          <article className={`surface benefit-app-card ${benefit.tone}`} key={benefit.title}>
            <div><span>{benefit.status}</span><small>{benefit.timing}</small></div>
            <h2>{benefit.title}</h2>
            <strong>{benefit.amount}</strong>
            <p>{benefit.text}</p>
          </article>
        ))}
      </section>

      <section className="surface setup-surface">
        <div className="surface-heading"><div><span className="page-kicker">One-time setup</span><h2>Benefits to enroll</h2></div><small>Complete these in your AMEX account</small></div>
        <div className="setup-list">
          {enrollments.map(([name, source]) => <div key={name}><span>○</span><strong>{name}</strong><small>{source}</small></div>)}
        </div>
      </section>
    </main>
  );
}
