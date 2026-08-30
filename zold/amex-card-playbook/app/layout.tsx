import type { Metadata, Viewport } from 'next';
import AppShell from './components/AppShell';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f8' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1e1e' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://amex-card-playbook.hunk.851.sh'),
  title: 'AMEX Card Playbook',
  description: 'Your cards, benefits, offers, and transactions—organized.',
  openGraph: {
    title: 'AMEX Card Playbook',
    description: 'Your cards, benefits, offers, and transactions—organized.',
    type: 'website',
    images: ['https://amex-card-playbook.hunk.851.sh/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMEX Card Playbook',
    description: 'Your cards, benefits, offers, and transactions—organized.',
    images: ['https://amex-card-playbook.hunk.851.sh/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
