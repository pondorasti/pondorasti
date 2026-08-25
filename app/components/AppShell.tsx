'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const links = [
  { href: '/', label: 'Overview', icon: '⌂' },
  { href: '/categories', label: 'Categories', icon: '◫' },
  { href: '/benefits', label: 'Benefits', icon: '✦' },
  { href: '/offers', label: 'Offers', icon: '%' },
  { href: '/transactions', label: 'Transactions', icon: '↕' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/">
          <span>A</span>
          <div><strong>Card Playbook</strong><small>AMEX Gold + Platinum</small></div>
        </Link>
        <nav aria-label="Primary navigation">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link className={active ? 'active' : ''} href={link.href} key={link.href}>
                <i>{link.icon}</i><span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <span><i /> Private dashboard</span>
          <small>Copilot synced · 552 matched</small>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="mobile-app-bar">
          <Link className="app-brand" href="/"><span>A</span><strong>Card Playbook</strong></Link>
          <span className="private-dot"><i /> Private</span>
        </header>
        {children}
      </div>
    </div>
  );
}
