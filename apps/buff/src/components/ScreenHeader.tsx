import type { ReactNode } from 'react'

export function ScreenHeader({ title }: { title: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-head px-4 py-4 backdrop-blur-xl md:px-[26px] md:py-[18px]">
      <h1 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h1>
    </div>
  )
}

/** Standard content container matching the old .pad */
export function Pad({ children }: { children: ReactNode }) {
  return <div className="max-w-[900px] px-4 pt-[18px] pb-10 md:px-[26px] md:pt-[22px]">{children}</div>
}

export function BlockTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mt-[26px] mb-3 text-xs font-bold uppercase tracking-[0.09em] text-dim first:mt-0">
      {children}
    </div>
  )
}
