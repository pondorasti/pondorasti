/* Shared starting positions. Movements merge their keyframes over one of these. */
import { merge, sym } from "./pose"
import type { Pose, Prop } from "./types"

/** Relaxed standing: arms hang slightly away from the thighs, soft elbows, loose hands. */
export const standing: Pose = merge(
  sym({
    shoulder: { abd: 7 },
    elbow: { flex: 12 },
    grip: 0.3,
    hip: { abd: 2, rot: 6 }
  }),
  { root: { ground: 1 } }
)

/**
 * Sitting upright, thighs level, shins vertical, feet flat on the floor (the body is
 * grounded through the feet). The seat must then sit right under the hips: use SEAT_HEIGHT.
 */
export function seated(opts: { knee?: number; hip?: number } = {}): Pose {
  const hip = opts.hip ?? 90
  const knee = opts.knee ?? 90
  return merge(
    sym({
      hip: { flex: hip, abd: 6, rot: 6 },
      knee: { flex: knee },
      ankle: { flex: knee - hip },
      grip: 0.3
    }),
    { root: { ground: 1, z: -0.02 } }
  )
}

/** Top of the seat under `seated()` (measured on the mesh: lowest point of the hips + 0.8 cm squish). */
export const SEAT_HEIGHT = 0.458

/**
 * A padded seat under the hips (front edge well short of the knees), its post, and optionally
 * a backrest that the upper back leans on.
 */
export function seatProps(
  seat = SEAT_HEIGHT,
  opts: { back?: { z: number; top: number }; front?: number; rear?: number } = {}
): Prop[] {
  const front = opts.front ?? 0.26
  const rear = opts.rear ?? -0.21
  const props: Prop[] = [
    {
      type: "box",
      position: [0, seat - 0.04, (front + rear) / 2],
      size: [0.42, 0.08, front - rear],
      color: "#2a2e35",
      contact: "seat"
    },
    {
      type: "box",
      position: [0, (seat - 0.08) / 2, (front + rear) / 2],
      size: [0.08, seat - 0.08, 0.08]
    }
  ]
  if (opts.back) {
    const bottom = seat + 0.12
    props.push({
      type: "box",
      position: [0, (bottom + opts.back.top) / 2, opts.back.z - 0.04],
      size: [0.26, opts.back.top - bottom, 0.08],
      color: "#2a2e35",
      contact: "back"
    })
  }
  return props
}
