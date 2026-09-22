import { Tooltip } from "@base-ui/react/tooltip"
import type { ReactElement, ReactNode } from "react"

export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ")

/** Wraps a control (rendered via `render`) with a tooltip. */
export function Hint({
  label,
  render,
  children
}: {
  label: string
  render: ReactElement
  children: ReactNode
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={render}>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} className="z-50">
          <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-[11px] text-ink shadow-[0_4px_16px_#00000026,0_0_0_0.5px_#00000014] backdrop-blur-xl transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-black/7 lg:mx-2 dark:bg-white/10" />
}
