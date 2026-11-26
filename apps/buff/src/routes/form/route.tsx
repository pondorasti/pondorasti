import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { movementGroups } from "~/form/catalog"

export const Route = createFileRoute("/form")({
  component: FormLayout
})

/** Form demos: movement list (column on desktop, chips on mobile) + the selected demo. */
function FormLayout() {
  const groups = movementGroups()
  return (
    <div className="md:grid md:min-h-full md:grid-cols-[250px_1fr]">
      <nav className="hidden border-r border-line md:block">
        <div className="sticky top-0 max-h-dvh overflow-y-auto px-3 py-[18px]">
          <div className="px-2.5 pb-3 pt-1.5 text-[19px] font-extrabold tracking-[-0.02em]">
            Form
          </div>
          {groups.map(({ group, items }) => (
            <div key={group} className="mb-3">
              <div className="px-2.5 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-dim">
                {group}
              </div>
              {items.map((m) => (
                <Link
                  key={m.id}
                  to="/form/$id"
                  params={{ id: m.id }}
                  className="block rounded-[11px] px-2.5 py-2 text-muted hover:bg-panel hover:text-txt"
                  activeProps={{ className: "bg-panel-2 !text-txt" }}
                >
                  <div className="text-[14px] font-semibold leading-snug">{m.title}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-dim">{m.cue}</div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>
      <div className="min-w-0">
        {/* mobile: horizontal chips */}
        <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3 md:hidden">
          {groups
            .flatMap(({ items }) => items)
            .map((m) => (
              <Link
                key={m.id}
                to="/form/$id"
                params={{ id: m.id }}
                className="flex-none rounded-full border border-line bg-panel px-3 py-1.5 text-[12.5px] font-semibold text-muted"
                activeProps={{ className: "!border-accent !text-txt" }}
              >
                {m.title}
              </Link>
            ))}
        </div>
        <Outlet />
      </div>
    </div>
  )
}
