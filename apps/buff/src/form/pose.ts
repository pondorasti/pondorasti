/* Pose helpers: authoring shortcuts + keyframe sampling. No three.js here. */
import type {
  BallJoint,
  Ease,
  Elbow,
  Hinge,
  Keyframe,
  Movement,
  Pose,
  Scapula,
  Variant,
  Wrist
} from "./types"

/** Flat channel map, e.g. { "shoulderR.flex": 30, "gripR": 0.8 } */
export type Channels = Record<string, number>

export interface Limbs {
  scapula?: Scapula
  shoulder?: BallJoint
  elbow?: Elbow
  wrist?: Wrist
  grip?: number
  hip?: BallJoint
  knee?: Hinge
  ankle?: Hinge
  toes?: Hinge
}

/** Same values on both sides: sym({ elbow: { flex: 90 } }) → { elbowL, elbowR } */
export function sym(limbs: Limbs): Pose {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(limbs)) {
    out[k + "L"] = v
    out[k + "R"] = v
  }
  return out as Pose
}

/** Both hands on symmetric points: grips(0.4, 1.3, 0.2) → reachL [0.4, …], reachR [-0.4, …] */
export function grips(x: number, y: number, z: number): Pose {
  return { reachL: [x, y, z], reachR: [-x, y, z] }
}

/** Both elbows pointing the same (mirrored) way, e.g. poles(1, -1, 0) = out and down. */
export function poles(x: number, y: number, z: number): Pose {
  return { poleL: [x, y, z], poleR: [-x, y, z] }
}

/** One side only: side("R", { shoulder: { flex: 30 } }) → { shoulderR } */
export function side(s: "L" | "R", limbs: Limbs): Pose {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(limbs)) out[k + s] = v
  return out as Pose
}

/** Swap left and right (mirror a pose through the body's midline). */
export function mirror(pose: Pose): Pose {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(pose)) {
    const m = /^(.*)([LR])$/.exec(k)
    if (m && Array.isArray(v)) out[m[1] + (m[2] === "L" ? "R" : "L")] = [-v[0], v[1], v[2]]
    else if (m) out[m[1] + (m[2] === "L" ? "R" : "L")] = v
    else if (k === "pelvis" || k === "spine" || k === "neck" || k === "head") {
      const a = v as { flex?: number; side?: number; twist?: number }
      out[k] = { ...a, side: a.side && -a.side, twist: a.twist && -a.twist }
    } else if (k === "root") {
      const r = v as { x?: number }
      out[k] = { ...r, x: r.x && -r.x }
    } else out[k] = v
  }
  return out as Pose
}

/** Deep-merge poses left to right (later wins, per channel). */
export function merge(...poses: (Pose | undefined)[]): Pose {
  const out: Record<string, unknown> = {}
  for (const p of poses) {
    if (!p) continue
    for (const [k, v] of Object.entries(p)) {
      out[k] =
        typeof v === "object" && v !== null && !Array.isArray(v)
          ? { ...(out[k] as object | undefined), ...(v as object) }
          : v
    }
  }
  return out as Pose
}

export function flatten(pose: Pose): Channels {
  const out: Channels = {}
  for (const [k, v] of Object.entries(pose)) {
    if (typeof v === "number") out[k] = v
    else if (Array.isArray(v)) ["x", "y", "z"].forEach((c, i) => (out[`${k}.${c}`] = v[i]))
    else if (v)
      for (const [c, n] of Object.entries(v)) if (typeof n === "number") out[`${k}.${c}`] = n
  }
  return out
}

const EASE: Record<Ease, (u: number) => number> = {
  linear: (u) => u,
  in: (u) => 1 - Math.cos((u * Math.PI) / 2),
  out: (u) => Math.sin((u * Math.PI) / 2),
  inOut: (u) => 0.5 - 0.5 * Math.cos(u * Math.PI)
}

/** Pre-baked variant: flat channels per keyframe, ready to sample. */
export interface Track {
  times: number[]
  frames: Channels[]
  eases: Ease[]
  keys: string[]
  smooth: boolean
}

export function buildTrack(movement: Movement, variant: Variant): Track {
  const kfs: Keyframe[] = [...variant.keyframes].sort((a, b) => a.at - b.at)
  const frames = kfs.map((k) => flatten(merge(movement.base, k.pose)))
  const keys = [...new Set(frames.flatMap((f) => Object.keys(f)))]
  return {
    times: kfs.map((k) => k.at),
    frames,
    eases: kfs.map((k) => k.ease ?? "inOut"),
    keys,
    smooth: movement.interpolation === "smooth"
  }
}

const wrap = (x: number) => ((x % 1) + 1) % 1

/** Sample a looping track at phase 0–1. Missing channels read as 0 (relaxed standing). */
export function sample(track: Track, phase: number): Channels {
  const { times, frames, keys } = track
  const n = times.length
  const out: Channels = {}
  if (n === 1) {
    for (const k of keys) out[k] = frames[0][k] ?? 0
    return out
  }
  const t = wrap(phase)
  // segment i: times[i] → times[i+1] (wrapping to times[0] + 1)
  let i = n - 1
  for (let j = 0; j < n; j++) if (times[j] <= t) i = j
  const t0 = times[i]
  const t1 = i + 1 < n ? times[i + 1] : times[0] + 1
  const tt = t < t0 ? t + 1 : t
  const u = t1 > t0 ? (tt - t0) / (t1 - t0) : 0
  const a = frames[i]
  const b = frames[(i + 1) % n]
  if (track.smooth) {
    // Catmull-Rom through the loop: organic, no stops at keyframes.
    const p = frames[(i - 1 + n) % n]
    const q = frames[(i + 2) % n]
    const u2 = u * u
    const u3 = u2 * u
    for (const k of keys) {
      const p0 = p[k] ?? 0
      const p1 = a[k] ?? 0
      const p2 = b[k] ?? 0
      const p3 = q[k] ?? 0
      const v =
        0.5 *
        (2 * p1 +
          (-p0 + p2) * u +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
      // no overshoot past the neighbouring keyframes (would push joints past their range)
      out[k] = Math.min(Math.max(v, Math.min(p1, p2)), Math.max(p1, p2))
    }
  } else {
    const e = EASE[track.eases[i]](u)
    for (const k of keys) {
      const x = a[k] ?? 0
      out[k] = x + ((b[k] ?? 0) - x) * e
    }
  }
  return out
}

/**
 * One rep that loops: pause at `start`, move to `end`, pause, move back.
 * `out` / `back` are the fractions of the loop spent moving each way.
 */
export function rep(
  start: Pose,
  end: Pose,
  opts: { pause?: number; out?: number } = {}
): Keyframe[] {
  const pause = opts.pause ?? 0.1
  const out = opts.out ?? 0.4
  return [
    { at: 0, pose: start },
    { at: pause, pose: start },
    { at: pause + out, pose: end },
    { at: pause * 2 + out, pose: end }
  ]
}

/** Slow breathing layered on any pose; `breath` runs -1…1. */
export function breathe(c: Channels, breath: number) {
  c["spine.flex"] = (c["spine.flex"] ?? 0) - breath * 0.8
  c["scapulaL.elev"] = (c["scapulaL.elev"] ?? 0) + breath * 0.8
  c["scapulaR.elev"] = (c["scapulaR.elev"] ?? 0) + breath * 0.8
  c["head.flex"] = (c["head.flex"] ?? 0) + breath * 0.5
}
