import { Button } from "@base-ui/react/button"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  Backpack,
  Bath,
  Bed,
  BedDouble,
  BedSingle,
  BookOpen,
  CloudRain,
  Columns2,
  Droplet,
  Dumbbell,
  Footprints,
  Gem,
  Glasses,
  Layers,
  type LucideIcon,
  Monitor,
  Pill,
  Package,
  Scissors,
  Shirt,
  Smartphone,
  Smile,
  Spool,
  SprayCan,
  TowelRack,
  WashingMachine,
  Watch
} from "lucide-react"
import type { ReactNode } from "react"
import { type Group, label, type Tag } from "../lib/product"

const TAG_ICONS: Record<Tag | Group, LucideIcon> = {
  accessories: Gem,
  apparel: Shirt,
  basics: Package,
  bathroom: Bath,
  bed: Bed,
  bedding: BedSingle,
  bedroom: BedDouble,
  books: BookOpen,
  bottoms: Columns2,
  carry: Backpack,
  hair: SprayCan,
  knitwear: Spool,
  laundry: WashingMachine,
  layers: Layers,
  office: Monitor,
  oral: Smile,
  outerwear: CloudRain,
  shirts: Scissors,
  shoes: Footprints,
  skin: Droplet,
  sunglasses: Glasses,
  supplements: Dumbbell,
  technology: Smartphone,
  tees: Shirt,
  towels: TowelRack,
  vitamins: Pill,
  watches: Watch,
  workout: Dumbbell
}

export function TagLabel({ tag }: { tag: Tag | Group }) {
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
