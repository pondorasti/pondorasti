import { Link, useLocation } from '@tanstack/react-router'
import { NAV, isActive } from './nav'

export function Sidebar() {
  const { pathname } = useLocation()
  return (
    <aside className="hidden md:flex flex-col gap-1.5 border-r border-line bg-sidebar px-3.5 py-[18px]">
      <div className="flex items-center gap-2.5 px-2.5 pt-2 pb-4">
        <div className="text-[19px] font-extrabold tracking-[-0.03em] text-accent">buff</div>
      </div>
      {NAV.map((n) => {
        const active = isActive(n, pathname)
        return (
          <Link
            key={n.label}
            to={n.to}
            params={n.params as never}
            className={
              'flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[14.5px] font-semibold ' +
              (active ? 'bg-panel-2 text-txt' : 'text-muted hover:bg-panel hover:text-txt')
            }
          >
            <n.icon className={'h-[19px] w-[19px] flex-none ' + (active ? 'text-accent' : '')} />
            {n.label}
          </Link>
        )
      })}
    </aside>
  )
}
