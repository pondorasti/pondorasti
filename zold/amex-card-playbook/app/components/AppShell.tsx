'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartRingIcon, CreditCardIcon, GiftIcon, Home01Icon,
  PercentCircleIcon, TransactionHistoryIcon,
} from '@hugeicons/core-free-icons';

const sections = [
  { label: 'Workspace', links: [
    { href: '/', label: 'Overview', icon: Home01Icon },
    { href: '/transactions', label: 'Transactions', icon: TransactionHistoryIcon },
  ] },
  { label: 'Plan', links: [
    { href: '/categories', label: 'Categories', icon: ChartRingIcon },
    { href: '/benefits', label: 'Benefits', icon: GiftIcon },
    { href: '/offers', label: 'Offers', icon: PercentCircleIcon },
  ] },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <nav aria-label="Primary navigation">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <span className="nav-section-label">{section.label}</span>
              {section.links.map((link) => {
                const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <Link className={active ? 'active' : ''} href={link.href} key={link.href}>
                    <i><HugeiconsIcon icon={link.icon} size={18} strokeWidth={1.8} /></i><span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="app-workspace">
        <header className="mobile-app-bar">
          <Link className="app-brand" href="/"><span><HugeiconsIcon icon={CreditCardIcon} size={17} strokeWidth={1.8} /></span><strong>Card Playbook</strong></Link>
          <span className="private-dot"><i /> Private</span>
        </header>
        {children}
      </div>
    </div>
  );
}
