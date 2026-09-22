import { Dumbbell, Gauge, Warehouse, type LucideProps } from "lucide-react"

const make = (Icon: typeof Dumbbell) => (props: LucideProps) => (
  <Icon strokeWidth={1.9} {...props} />
)

/** Routine / training */
export const IconBarbell = make(Dumbbell)
/** Load targets */
export const IconGauge = make(Gauge)
/** Equipment / gear */
export const IconBox = make(Warehouse)
