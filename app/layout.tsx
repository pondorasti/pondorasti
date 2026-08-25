import type { Metadata } from 'next';
import AppShell from './components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://amex-card-playbook.pondorasti.chatgpt.site'),
  title: 'AMEX Card Playbook',
  description: 'Your cards, benefits, offers, and transactions—organized.',
  openGraph: {
    title: 'AMEX Card Playbook',
    description: 'Your cards, benefits, offers, and transactions—organized.',
    type: 'website',
    images: ['https://amex-card-playbook.pondorasti.chatgpt.site/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMEX Card Playbook',
    description: 'Your cards, benefits, offers, and transactions—organized.',
    images: ['https://amex-card-playbook.pondorasti.chatgpt.site/og.png'],
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
