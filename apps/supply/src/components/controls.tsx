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
  type LucideIcon,
  Monitor,
  Shirt,
  Smartphone,
  Smile,
  Watch
} from "lucide-react"
import type { ReactNode } from "react"
import { label, type Tag } from "../lib/product"

const TAG_ICONS: Record<Tag, LucideIcon> = {
  apparel: Shirt,
  bathroom: Bath,
  bedroom: BedDouble,
  books: BookOpen,
  carry: Backpack,
  office: Monitor,
  oral: Smile,
  shoes: Footprints,
  skin: Droplet,
  sunglasses: Glasses,
  technology: Smartphone,
  watches: Watch
}

export function TagLabel({ tag }: { tag: Tag }) {
  const Icon = TAG_ICONS[tag]
  return (
    <>
      <Icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
      {label(tag)}
    </>
  )
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
