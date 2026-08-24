import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AMEX Card Playbook',
  description: 'A private dashboard for optimizing AMEX Platinum and Gold card usage, benefits, offers, and transactions.',
  openGraph: {
    title: 'AMEX Card Playbook',
    description: 'Spend with intent. Keep the benefits that fit.',
    type: 'website',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMEX Card Playbook',
    description: 'Spend with intent. Keep the benefits that fit.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
