import TransactionsExplorer from '../components/TransactionsExplorer';

type Props = { searchParams: Promise<{ view?: string }> };

export default async function TransactionsPage({ searchParams }: Props) {
  const { view } = await searchParams;
  return (
    <main className="app-page wide-page">
      <header className="app-page-header">
        <div><span className="page-kicker">Transactions</span><h1>Every purchase, searchable.</h1><p>Copilot categories and merchant names with AMEX points logic.</p></div>
      </header>
      <TransactionsExplorer initialView={view} />
    </main>
  );
}
