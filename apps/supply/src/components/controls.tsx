import { Button } from "@base-ui/react/button"
import { Select } from "@base-ui/react/select"
import { Tooltip } from "@base-ui/react/tooltip"
import { Check, ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

export function IconButton({
  label,
  children,
  onClick
}: {
  label: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={<Button className="icon-control" aria-label={label} onClick={onClick} />}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className="z-50 rounded-md bg-ink px-2.5 py-1.5 text-xs text-page shadow-sm">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function SelectControl({
  label,
  value,
  items,
  onChange,
  icon
}: {
  label: string
  value: string
  items: { label: string; value: string }[]
  onChange: (value: string) => void
  icon?: ReactNode
}) {
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <Select.Trigger aria-label={label} className="control max-w-full justify-between">
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <Select.Value className="truncate" />
        </span>
        <Select.Icon>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner align="end" sideOffset={6} alignItemWithTrigger={false} className="z-40">
          <Select.Popup className="max-h-[min(360px,var(--available-height))] min-w-[180px] overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-lg">
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className="relative flex min-h-10 cursor-pointer items-center gap-3 rounded px-3 pr-9 text-sm outline-none data-highlighted:bg-page"
                >
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-3">
                    <Check size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
