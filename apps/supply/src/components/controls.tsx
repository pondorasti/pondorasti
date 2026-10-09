import { Button } from "@base-ui/react/button"
import { Select } from "@base-ui/react/select"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  Backpack,
  Bath,
  BedDouble,
  BookOpen,
  Check,
  ChevronDown,
  Droplet,
  Footprints,
  Glasses,
  Heart,
  type LucideIcon,
  Monitor,
  Shirt,
  Smartphone,
  Smile,
  Tag
} from "lucide-react"
import type { ReactNode } from "react"

/** Tags are free-form in Notion; unknown ones fall back to a generic tag icon. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Apparel: Shirt,
  Bathroom: Bath,
  Bedroom: BedDouble,
  Books: BookOpen,
  Carry: Backpack,
  Office: Monitor,
  Oral: Smile,
  Shoes: Footprints,
  Skin: Droplet,
  Sunglasses: Glasses,
  Technology: Smartphone,
  Wishlist: Heart
}

export function CategoryIcon({ tag }: { tag: string }) {
  const Icon = CATEGORY_ICONS[tag] ?? Tag
  return <Icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
}

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
          <Tooltip.Popup className="z-50 rounded-full bg-ink px-2.5 py-1 text-xs text-page shadow-sm">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function SelectControl({
  label,
  prefix,
  value,
  items,
  onChange
}: {
  label: string
  prefix?: string
  value: string
  items: { label: string; value: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <Select.Trigger
        aria-label={label}
        className="pill max-w-full gap-2 text-ink ring-transparent hover:bg-surface"
      >
        <span className="flex min-w-0 items-center gap-1">
          {prefix && <span className="text-muted">{prefix}</span>}
          <Select.Value className="truncate font-medium" />
        </span>
        <Select.Icon className="text-muted">
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner align="end" sideOffset={6} alignItemWithTrigger={false} className="z-40">
          <Select.Popup className="max-h-[min(360px,var(--available-height))] min-w-[180px] overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-lg ring-1 ring-line">
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className="relative flex min-h-9 cursor-pointer items-center gap-3 rounded-xl px-3 pr-9 text-sm outline-none data-highlighted:bg-page"
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
