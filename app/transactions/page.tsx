import TransactionsExplorer from '../components/TransactionsExplorer';

type Props = { searchParams: Promise<{ view?: string }> };

export default async function TransactionsPage({ searchParams }: Props) {
  const { view } = await searchParams;
  return (
    <main className="app-page wide-page">
      <header className="app-page-header">
        <h1>Transactions</h1>
      </header>
      <TransactionsExplorer initialView={view} />
    </main>
  );
}
