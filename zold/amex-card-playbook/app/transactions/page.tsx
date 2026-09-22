import TransactionsExplorer, { type TransactionView } from '../components/TransactionsExplorer';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view } = await searchParams;
  const initialView: TransactionView = view === 'misrouted' ? 'misrouted' : 'all';

  return (
    <main className="app-page wide-page">
      <header className="app-page-header">
        <h1>Transactions</h1>
      </header>
      <TransactionsExplorer key={initialView} initialView={initialView} />
    </main>
  );
}
