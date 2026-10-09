import { Button } from "@base-ui/react/button"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  Backpack,
  Bath,
  BedDouble,
  BookOpen,
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
