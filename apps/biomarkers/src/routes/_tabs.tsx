import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { stats } from "~/metrics"

export const Route = createFileRoute("/_tabs")({
  component: Tabs
})

const tab =
  "flex-1 rounded-[7px] px-2.5 py-1.75 text-center text-[13px] leading-none font-semibold transition-colors data-[status=active]:bg-segment-on data-[status=active]:shadow-[0_3px_8px_rgba(0,0,0,0.04),0_3px_1px_rgba(0,0,0,0.04)]"

function Tabs() {
  return (
    <>
      <div className="sticky top-0 z-5 bg-[linear-gradient(180deg,var(--page)_80%,transparent)] pt-2 backdrop-blur-[20px] backdrop-saturate-180">
        <div className="flex items-end justify-between gap-3 pt-3.5 pb-1 font-display text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">
          <h1 className="m-0 text-[length:inherit]">Health</h1>
          <span className="font-sans text-[13px] leading-[1.2] font-medium tracking-normal text-ink-3">
            Alexandru · 24M · {stats.records} records · {stats.metrics} metrics · {stats.sources}{" "}
            labs
          </span>
        </div>
        <nav aria-label="Sections" className="mt-2 mb-3 flex w-full rounded-[9px] bg-segment p-0.5">
          <Link to="/" activeOptions={{ exact: true }} className={tab}>
            Summary
          </Link>
          <Link to="/browse" className={tab}>
            Browse
          </Link>
          <Link to="/reports" className={tab}>
            PDFs
          </Link>
        </nav>
      </div>
      <Outlet />
    </>
  )
}
