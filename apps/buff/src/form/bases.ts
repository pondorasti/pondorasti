/* Shared starting positions. Movements merge their keyframes over one of these. */
import { merge, sym } from "./pose"
import type { Pose, Prop } from "./types"

/** Relaxed standing: arms hang slightly away from the thighs, soft elbows, loose hands. */
export const standing: Pose = sym({
  shoulder: { abd: 7 },
  elbow: { flex: 12 },
  grip: 0.3,
  hip: { abd: 2, rot: 6 }
})

/**
 * Sitting upright on a seat whose top is `seat` metres off the floor, thighs level,
 * shins vertical. Returns the pose plus a seat prop to put under it.
 */
export function seated(seat = 0.47, opts: { knee?: number; hip?: number } = {}): Pose {
  const hip = opts.hip ?? 90
  const knee = opts.knee ?? 90
  // pelvis (hip joint) sits ~9 cm above the seat; standing hip height is 0.97 m
  return merge(
    sym({
      hip: { flex: hip, abd: 8, rot: 8 },
      knee: { flex: knee },
      ankle: { flex: knee - hip },
      grip: 0.3
    }),
    { root: { y: seat + 0.09 - 0.971, z: -0.02 } }
  )
}

/** A padded bench seat, centred under the hips, plus an optional backrest. */
export function seatProps(
  seat = 0.47,
  opts: { back?: boolean; depth?: number; z?: number } = {}
): Prop[] {
  const depth = opts.depth ?? 0.42
  const z = opts.z ?? 0.1
  const props: Prop[] = [
    { type: "box", position: [0, seat - 0.04, z], size: [0.42, 0.08, depth], color: "#2a2e35" },
    { type: "box", position: [0, (seat - 0.08) / 2, z], size: [0.08, seat - 0.08, 0.08] }
  ]
  if (opts.back)
    props.push({
      type: "box",
      position: [0, seat + 0.36, z - depth / 2 - 0.06],
      size: [0.4, 0.62, 0.08],
      rotation: [-8, 0, 0],
      color: "#2a2e35"
    })
  return props
}
