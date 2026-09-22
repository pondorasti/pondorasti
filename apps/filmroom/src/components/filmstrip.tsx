import type { Filmroom } from "~/viewer/use-filmroom"
import { cx } from "./controls"

const number = (index: number) => String(index + 1).padStart(2, "0")

export function Filmstrip({ app }: { app: Filmroom }) {
  return (
    <aside
      aria-label="Study images"
      className="surface-sidebar order-2 overflow-auto border-b border-line p-2.5 backdrop-blur-[32px] backdrop-saturate-160 sm:order-none sm:col-start-1 sm:row-start-1 sm:flex sm:min-h-0 sm:flex-col sm:border-r sm:border-b-0 sm:border-edge sm:px-2 sm:pt-5.5 sm:pb-4 lg:px-3"
    >
      <nav aria-label="Choose a projection" className="flex gap-1 sm:flex-col sm:gap-1.25">
        {app.views.map((view, index) => {
          const active = index === app.active
          return (
            <button
              key={index}
              type="button"
              aria-label={`View ${index + 1}: ${view.data.name}`}
              aria-pressed={active}
              onClick={() => app.select(index)}
              className={cx(
                "relative flex flex-1 flex-col items-center gap-1.75 rounded-lg px-0.75 py-1.75 text-left sm:w-full sm:flex-none sm:flex-row sm:gap-2 sm:p-1.75 lg:gap-2.75 lg:p-2",
                active
                  ? "surface-selected text-white shadow-[0_1px_2px_#0058c118,inset_0_1px_#ffffff1c]"
                  : "hover:bg-black/[0.024] dark:hover:bg-white/[0.035]"
              )}
            >
              <div
                className={cx(
                  "grid h-15.25 w-12.75 shrink-0 place-items-center overflow-hidden rounded bg-[#070708] sm:h-13.25 sm:w-9.75 md:h-15.25 md:w-12.75",
                  active
                    ? "shadow-[0_0_0_1px_#ffffff4a,0_1px_2px_#00418d22]"
                    : "shadow-[0_0_0_0.5px_#00000020,0_1px_2px_#00000018] dark:shadow-[0_0_0_0.5px_#ffffff18,0_1px_2px_#00000035]"
                )}
              >
                <img src={view.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex min-w-0 flex-col items-center gap-0.75 sm:items-start sm:gap-1.25">
                <span className="max-w-full truncate text-[11px] font-medium tracking-[-0.15px] md:text-xs lg:text-[13px]">
                  <span className="sr-only">{number(index)} </span>
                  {view.data.name}
                </span>
                <small
                  className={cx(
                    "text-[8px] tabular-nums md:text-[9px] lg:text-[10px]",
                    active
                      ? "text-[#d5e9ff] dark:text-[#daebff]"
                      : "text-[#8b8b92] dark:text-[#a3a3ae]"
                  )}
                >
                  {view.data.columns} × {view.data.rows}
                </small>
              </div>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
