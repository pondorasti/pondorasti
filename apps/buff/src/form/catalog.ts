/* Every file in ./movements that default-exports a Movement shows up in the app. */
import type { Movement } from "./types"

const modules = import.meta.glob<{ default: Movement }>("./movements/*.ts", { eager: true })

export const movements: Movement[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

export const getMovement = (id: string) => movements.find((m) => m.id === id)

/** movements grouped for the list, in order of first appearance */
export const movementGroups = (): { group: string; items: Movement[] }[] => {
  const groups = new Map<string, Movement[]>()
  for (const m of movements) groups.set(m.group, [...(groups.get(m.group) ?? []), m])
  return [...groups].map(([group, items]) => ({ group, items }))
}

export const movementsForExercise = (exerciseId: string) =>
  movements.filter((m) => m.exercise === exerciseId)
