import { Link, useLocation } from '@tanstack/react-router'
import { NAV, isActive } from './nav'

export function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] flex border-t border-line bg-bar backdrop-blur-2xl md:hidden"
      style={{ height: 'calc(60px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map((n) => {
        const active = isActive(n, pathname)
        return (
          <Link
            key={n.label}
            to={n.to}
            params={n.params as never}
            className={
              'flex flex-1 flex-col items-center justify-center gap-[3px] text-[10.5px] font-semibold ' +
              (active ? 'text-accent' : 'text-dim')
            }
          >
            <n.icon className="h-[21px] w-[21px]" />
            {n.mobile}
          </Link>
        )
      })}
    </nav>
  )
}
