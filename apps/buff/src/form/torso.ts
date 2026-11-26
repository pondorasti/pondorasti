/* The torso as a stack of horizontal ellipses (measured on the mesh in relaxed standing and
   carried by the spine bones), so an elastic band held in both hands can wrap around the
   front of the body instead of passing through it. */
import { Object3D, Quaternion, Vector2, Vector3 } from "three"
import type { Rig } from "./rig"
import { Body, PARTS } from "./skin"

export interface Slice {
  bone: string
  /** centre, as an offset from the bone in its neutral frame */
  center: Vector3
  rx: number
  rz: number
}

const SPINE = ["pelvis", "spine_01", "spine_02", "spine_03"]
/** keep a band's centre line this far off the skin (band radius + a little) */
const PAD = 0.02

/** Call with the rig in relaxed standing (`rig.apply({})`). */
export function measureTorso(model: Object3D, rig: Rig): Slice[] {
  rig.apply({})
  const body = new Body(model)
  const P = body.positions
  const torso = body.partVerts[PARTS.indexOf("torso")]
  const bones = SPINE.map((b) => ({
    b,
    p: model.getObjectByName(b)!.getWorldPosition(new Vector3())
  }))
  const slices: Slice[] = []
  for (let h = 0.98; h <= 1.46; h += 0.02) {
    let x0 = Infinity
    let x1 = -Infinity
    let z0 = Infinity
    let z1 = -Infinity
    for (const i of torso) {
      if (Math.abs(P[i * 3 + 1] - h) > 0.012) continue
      x0 = Math.min(x0, P[i * 3])
      x1 = Math.max(x1, P[i * 3])
      z0 = Math.min(z0, P[i * 3 + 2])
      z1 = Math.max(z1, P[i * 3 + 2])
    }
    if (!Number.isFinite(x0)) continue
    const owner = bones.filter((x) => x.p.y <= h).at(-1) ?? bones[0]
    slices.push({
      bone: owner.b,
      center: new Vector3((x0 + x1) / 2, h, (z0 + z1) / 2).sub(owner.p),
      rx: (x1 - x0) / 2 + PAD,
      rz: (z1 - z0) / 2 + PAD
    })
  }
  return slices
}

/** keep a band this far from the centre line of an arm near the band */
const ARM_RADIUS = 0.058
const ARM_BONES = ["upperarm", "lowerarm", "hand"] as const

/**
 * Path of a band from a to b: straight if it clears the body, otherwise the taut path around
 * the body at the band's height (torso slice + the arms that cross that height), wrapping
 * the side the hands are on. That's the convex hull of the obstacles, like a real band.
 */
export function wrapAroundTorso(rig: Rig, slices: Slice[], a: Vector3, b: Vector3): Vector3[] {
  if (!slices.length) return [a, b]
  const mid = a.clone().add(b).multiplyScalar(0.5)
  let best: { slice: Slice; origin: Vector3; rot: Quaternion; dist: number } | null = null
  for (const slice of slices) {
    const rot = rig.anatomical(slice.bone)
    const origin = rig.bonePosition(slice.bone).add(slice.center.clone().applyQuaternion(rot))
    const dist = Math.abs(origin.y - mid.y)
    if (!best || dist < best.dist) best = { slice, origin, rot, dist }
  }
  if (!best || best.dist > 0.05) return [a, b]
  const { slice, origin, rot } = best
  const inv = rot.clone().invert()
  const toLocal = (p: Vector3) => p.clone().sub(origin).applyQuaternion(inv)
  const la = toLocal(a)
  const lb = toLocal(b)

  // obstacles in the slice plane: the torso ellipse and the arms near the band's height
  const obstacles: Vector2[] = []
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2
    obstacles.push(new Vector2(Math.cos(t) * slice.rx, Math.sin(t) * slice.rz))
  }
  for (const s of ["l", "r"]) {
    const chain = ARM_BONES.map((n) => toLocal(rig.bonePosition(`${n}_${s}`)))
    for (let k = 1; k < chain.length; k++) {
      for (let t = 0; t <= 1; t += 0.1) {
        const p = chain[k - 1].clone().lerp(chain[k], t)
        // ignore the wrist next to the hand holding the band (the band starts there)
        if (Math.min(p.distanceTo(la), p.distanceTo(lb)) < 0.11) continue
        const h = (p.y - (la.y + lb.y) / 2) / ARM_RADIUS
        if (Math.abs(h) >= 1) continue
        const r = ARM_RADIUS * Math.sqrt(1 - h * h)
        for (let i = 0; i < 12; i++) {
          const u = (i / 12) * Math.PI * 2
          obstacles.push(new Vector2(p.x + Math.cos(u) * r, p.z + Math.sin(u) * r))
        }
      }
    }
  }
  const A = new Vector2(la.x, la.z)
  const B = new Vector2(lb.x, lb.z)
  // a band held in front wraps the front of the body, unless both hands are behind the back
  const side = (la.z + lb.z) / 2 > -slice.rz ? 1 : -1
  if (!obstacles.some((o) => crossesSegment(A, B, o, side))) return [a, b]
  const path2 = hullPath(A, B, obstacles, side)
  // back to 3D, interpolating height along the path
  const pts = path2.map((p) => new Vector3(p.x, 0, p.y))
  let total = 0
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push((total += pts[i].distanceTo(pts[i - 1])))
  return pts.map((p, i) => {
    p.y = la.y + (lb.y - la.y) * (total ? cum[i] / total : 0)
    return p.applyQuaternion(rot).add(origin)
  })
}

/** does obstacle point o stick out past the straight band (toward `side`), i.e. is it in the way? */
function crossesSegment(a: Vector2, b: Vector2, o: Vector2, side: number) {
  const ab = b.clone().sub(a)
  const t = o.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-12)
  if (t <= 0 || t >= 1) return false
  // obstacle point in front of (beyond) the straight band, measured toward +z of the slice
  const cross = ab.x * (o.y - a.y) - ab.y * (o.x - a.x)
  return Math.sign(ab.x) * side * cross > 0
}

/** Chain of the convex hull of {a, b, pts} from a to b on the `side` (+1 = +y) */
function hullPath(a: Vector2, b: Vector2, pts: Vector2[], side: number): Vector2[] {
  const all = [a, b, ...pts].sort((p, q) => p.x - q.x || p.y - q.y)
  const cross = (o: Vector2, p: Vector2, q: Vector2) =>
    (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x)
  const half = (list: Vector2[]) => {
    const h: Vector2[] = []
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop()
      h.push(p)
    }
    return h
  }
  const lower = half(all)
  const upper = half([...all].reverse())
  // `upper` runs right→left along +y side, `lower` left→right along -y side
  const chain = side > 0 ? upper.slice().reverse() : lower
  const ia = chain.indexOf(a)
  const ib = chain.indexOf(b)
  if (ia < 0 || ib < 0) return [a, b]
  const seg = ia < ib ? chain.slice(ia, ib + 1) : chain.slice(ib, ia + 1).reverse()
  return seg
}
