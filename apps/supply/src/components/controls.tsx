import { Button } from "@base-ui/react/button"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  Archive,
  Backpack,
  Bath,
  Bed,
  BedDouble,
  BedSingle,
  BookOpen,
  Boxes,
  CloudRain,
  Columns2,
  Droplet,
  Dumbbell,
  Footprints,
  Gem,
  Gift,
  Glasses,
  Layers,
  type LucideIcon,
  Monitor,
  Package,
  Pill,
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
import { type Group, label, type Tag, type View, viewOf } from "../lib/product"

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

const VIEW_ICONS: Record<View, LucideIcon> = {
  collection: Boxes,
  wishlist: Gift,
  archive: Archive
}

export function ViewLabel({ view }: { view: View }) {
  const Icon = VIEW_ICONS[view]
  return (
    <>
      <Icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
      {viewOf(view).label}
    </>
  )
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

/** An icon-only link to another site, opened in a new tab. */
export function IconLink({
  label,
  href,
  children
}: {
  label: string
  href: string
  children: ReactNode
}) {
  return (
    <a className="icon-control" aria-label={label} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** GitHub's mark (Octicons `mark-github`, MIT); Lucide ships no brand icons. */
export function GitHubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  )
}
