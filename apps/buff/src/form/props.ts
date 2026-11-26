/* Equipment geometry in world space. Shared by the viewer (to draw it) and the
   checks (to collide it with the body), so both always agree. */
import { Euler, Quaternion, Vector3 } from "three"
import type { Rig } from "./rig"
import { wrapAroundTorso, type Slice } from "./torso"
import type { Anchor, Prop } from "./types"

export type LinearProp = Extract<Prop, { from: Anchor }>
export type BoxProp = Extract<Prop, { type: "box" }>

export const PULLEY_RADIUS = 0.078

export function isLinear(p: Prop): p is LinearProp {
  return p.type === "cable" || p.type === "bar" || p.type === "band"
}

export function propRadius(p: LinearProp): number {
  if (p.type === "band") return 0.011
  if (p.type === "bar") return p.radius ?? 0.014
  return p.radius ?? 0.005
}

/** Which hands hold this prop (its ends are on the grips / hand bones). */
export function heldBy(p: LinearProp): ("L" | "R")[] {
  const hands = new Set<"L" | "R">()
  for (const a of [p.from, p.to]) {
    if (a === "gripL") hands.add("L")
    else if (a === "gripR") hands.add("R")
    else if (a === "grips") {
      hands.add("L")
      hands.add("R")
    } else if (typeof a === "object" && "bone" in a && a.bone.startsWith("hand_"))
      hands.add(a.bone.endsWith("_l") ? "L" : "R")
  }
  return [...hands]
}

/** End points of a cable / bar / band (bars include their overhang). Call after rig.apply. */
export function segmentOf(rig: Rig, p: LinearProp, a = new Vector3(), b = new Vector3()) {
  rig.anchor(p.from, a)
  rig.anchor(p.to, b)
  if (p.type === "bar") {
    const overhang = p.overhang ?? 0.2
    const dir = b.clone().sub(a)
    const len = dir.length()
    if (len > 1e-6) {
      dir.divideScalar(len)
      a.addScaledVector(dir, -overhang)
      b.addScaledVector(dir, overhang)
    }
  }
  return { a, b }
}

export function boxRotation(p: BoxProp) {
  const [x, y, z] = (p.rotation ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180)
  return new Quaternion().setFromEuler(new Euler(x, y, z))
}

/**
 * The drawn path of a cable / bar / band as a polyline. Bands wrap around the torso
 * (pass the slices from measureTorso) instead of cutting through it.
 */
export function pathOf(rig: Rig, p: LinearProp, torso?: Slice[]): Vector3[] {
  const { a, b } = segmentOf(rig, p)
  if (p.type === "band" && torso) return wrapAroundTorso(rig, torso, a, b)
  return [a, b]
}
