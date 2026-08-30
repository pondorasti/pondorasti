import TransactionsExplorer from '../components/TransactionsExplorer';

export default function TransactionsPage() {
  return (
    <main className="app-page wide-page">
      <header className="app-page-header">
        <h1>Transactions</h1>
      </header>
      <TransactionsExplorer />
    </main>
  );
}
