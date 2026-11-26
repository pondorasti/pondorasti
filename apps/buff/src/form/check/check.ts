/* ==========================================================================
   Physical sanity checks for a movement, run on the real skinned mesh at
   many sampled frames of both variants:

   - rom        every joint angle inside a real human range
   - prop       bars / cables / bands / pulleys / boxes don't pass through the
                body (the hands holding a bar may squeeze it a little)
   - self       hands, forearms, upper arms and legs don't pass through other
                body parts (neighbouring parts like elbow creases are exempt)
   - grip       a held bar/handle/band sits in the closed hand
   - bar        a two-handed bar stays level and the grip width stays fixed
   - floor      nothing sinks into the floor
   - seat/feet  hips rest on "seat" boxes, soles on "feet" boxes or the floor,
                and planted feet don't slide
   - skin       no triangle of the skin collapses or stretches like a broken twist
   ========================================================================== */
import { Object3D, Quaternion, Vector3 } from "three"
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js"
import { Rig } from "../rig"
import { breathe, buildTrack, sample, type Channels } from "../pose"
import { boxRotation, heldBy, isLinear, pathOf, propRadius, PULLEY_RADIUS } from "../props"
import { measureTorso } from "../torso"
import type { Movement } from "../types"
import { Body, PARTS, VertexGrid, type Part } from "../skin"

export interface Issue {
  movement: string
  variant: "good" | "bad"
  at: number
  kind: "rom" | "twist" | "prop" | "self" | "grip" | "bar" | "floor" | "seat" | "feet" | "skin"
  what: string
  /** how bad: cm for distances, degrees for angles, ratio for skin */
  amount: number
}

/** Joint ranges (degrees) — generous adult active ranges. */
export const ROM: Record<string, [number, number]> = {
  "pelvis.flex": [-25, 45],
  "pelvis.side": [-15, 15],
  "pelvis.twist": [-20, 20],
  "spine.flex": [-25, 60],
  "spine.side": [-30, 30],
  "spine.twist": [-35, 35],
  "neck.flex": [-45, 50],
  "neck.side": [-35, 35],
  "neck.twist": [-60, 60],
  "head.flex": [-25, 25],
  "head.side": [-15, 15],
  "head.twist": [-20, 20],
  "scapula.elev": [-10, 25],
  "scapula.protract": [-25, 20],
  "elbow.flex": [0, 145],
  "elbow.pron": [-85, 80],
  "wrist.flex": [-60, 70],
  "wrist.dev": [-30, 20],
  grip: [0, 1],
  "hip.flex": [-25, 125],
  "hip.abd": [-20, 45],
  "hip.rot": [-35, 45],
  "knee.flex": [0, 140],
  "ankle.flex": [-45, 30],
  "toes.flex": [0, 60],
  stress: [0, 1]
}

const romKey = (k: string) =>
  k.replace(/^(scapula|shoulder|elbow|wrist|grip|hip|knee|ankle|toes)[LR]/, "$1")

/** Body-part pairs that must not overlap, with the allowed overlap in metres. */
const SELF_PAIRS: [Part, Part, number][] = []
for (const s of ["L", "R"] as const) {
  const o = s === "L" ? "R" : "L"
  for (const p of ["head", "torso", "thighL", "thighR", "calfL", "calfR"] as Part[]) {
    SELF_PAIRS.push([`hand${s}`, p, 0.012], [`forearm${s}`, p, 0.012])
  }
  SELF_PAIRS.push(
    [`hand${s}`, `upperarm${s}`, 0.012],
    [`hand${s}`, `upperarm${o}`, 0.012],
    [`hand${s}`, `forearm${o}`, 0.015],
    [`forearm${s}`, `upperarm${o}`, 0.012],
    [`upperarm${s}`, "head", 0.012],
    [`upperarm${s}`, `thigh${s}`, 0.012],
    [`foot${s}`, `calf${o}`, 0.012],
    [`foot${s}`, `foot${o}`, 0.012]
  )
}
SELF_PAIRS.push(["handL", "handR", 0.02], ["thighL", "thighR", 0.015], ["calfL", "calfR", 0.012])

/** Shoulder limits, measured on the actual arm (see Rig.shoulder). */
const SHOULDER = { elevation: 175, behind: 62, rotation: [-80, 100] as [number, number] }

/** Max twist (degrees) of a bone about its own axis vs its parent, beyond which skinning breaks. */
const TWIST_LIMIT: Record<string, number> = {
  lowerarm: 70,
  hand: 55,
  upperarm: 110,
  thigh: 50,
  calf: 20,
  foot: 30
}

const PROP_TOLERANCE = 0.006
/** a holding hand may squeeze into the bar this much (palm flesh) */
const GRIP_SQUEEZE = 0.025
/** a triangle is badly distorted below/above these area ratios vs relaxed standing */
const SKIN_MIN_AREA = 0.15
const SKIN_MAX_AREA = 4
/** …and a part is broken when more than this share of its triangles are */
const SKIN_PATCH = 0.03

export interface CheckOptions {
  /** phase step between sampled frames */
  step?: number
}

export function checkMovement(scene: Object3D, m: Movement, opts: CheckOptions = {}): Issue[] {
  const step = opts.step ?? 0.02
  const issues: Issue[] = []
  for (const variant of ["good", "bad"] as const) {
    const model = cloneSkinned(scene)
    const rig = new Rig(model)
    const body = new Body(model)
    const torso = measureTorso(model, rig)
    // skin distortion is measured against relaxed standing, not the T-pose the mesh was modelled in
    rig.apply({})
    body.update()
    body.setBaseline()
    const track = buildTrack(m, m[variant])
    const props = m.props ?? []
    const add = (at: number, kind: Issue["kind"], what: string, amount: number) =>
      issues.push({ movement: m.id, variant, at: Math.round(at * 1000) / 1000, kind, what, amount })

    const ballStart: Record<string, Vector3> = {}
    const gripWidths: number[] = []
    const n = Math.round(1 / step)
    for (let f = 0; f < n; f++) {
      const at = f * step
      const c = sample(track, at)
      // the viewer layers breathing on top: test both ends of a breath
      breathe(c, f % 2 ? 1 : -1)
      const used = rig.apply(c)
      body.update()
      checkRom(used, (what, amount) => add(at, "rom", what, amount))
      for (const s of ["L", "R"] as const) {
        const sh = rig.shoulder(s)
        if (sh.elevation > SHOULDER.elevation)
          add(
            at,
            "rom",
            `shoulder${s} elevation ${round(sh.elevation)}°`,
            round(sh.elevation - SHOULDER.elevation)
          )
        if (sh.behind > SHOULDER.behind)
          add(
            at,
            "rom",
            `shoulder${s} arm behind body ${round(sh.behind)}°`,
            round(sh.behind - SHOULDER.behind)
          )
        const [lo, hi] = SHOULDER.rotation
        if (sh.rotation < lo || sh.rotation > hi)
          add(
            at,
            "rom",
            `shoulder${s} rotation ${round(sh.rotation)}°`,
            round(Math.max(lo - sh.rotation, sh.rotation - hi))
          )
      }
      for (const [bone, limit] of Object.entries(TWIST_LIMIT))
        for (const s of ["l", "r"]) {
          const t = rig.twist(`${bone}_${s}`)
          if (Math.abs(t) > limit) add(at, "twist", `${bone}_${s} twisted`, round(Math.abs(t)))
        }
      for (const s of ["L", "R"] as const) {
        if (!(`reach${s}.x` in used)) continue
        const target = new Vector3(used[`reach${s}.x`], used[`reach${s}.y`], used[`reach${s}.z`])
        const miss = rig.anchor(`grip${s}`).distanceTo(target)
        if (miss > 0.01) add(at, "grip", `hand${s} can't reach its target`, cm(miss))
      }

      const all = new VertexGrid(body, body.partVerts.flat())
      const P = body.positions

      // ---- linear props (bars, cables, bands)
      for (const p of props) {
        if (!isLinear(p)) continue
        const path = pathOf(rig, p, torso)
        const r = propRadius(p)
        const hands = heldBy(p).map((s) => PARTS.indexOf(`hand${s}`))
        const worst = new Map<number, number>()
        for (let k = 1; k < path.length; k++) {
          const a = path[k - 1]
          const b = path[k]
          const len = a.distanceTo(b)
          for (let t = 0; t <= len; t += 0.01) {
            const q = a.clone().lerp(b, len ? t / len : 0)
            const { index, d } = all.signed(q.x, q.y, q.z)
            if (index < 0) continue
            const part = body.part[index]
            const allowed = hands.includes(part) ? -GRIP_SQUEEZE : r - PROP_TOLERANCE
            if (d < allowed) worst.set(part, Math.max(worst.get(part) ?? 0, allowed - d))
          }
        }
        for (const [part, depth] of worst)
          add(at, "prop", `${p.type} through ${PARTS[part]}`, cm(depth))
        // a band held in front of the body wraps the front, never round the back
        if (p.type === "band" && path.length > 2) {
          const ends = Math.min(path[0].z, path[path.length - 1].z)
          const back = Math.min(...path.map((q) => q.z))
          if (back < ends - 0.02) add(at, "prop", "band wraps behind the body", cm(ends - back))
        }

        // held ends really sit in the hand
        for (const end of [p.from, p.to]) {
          if (end !== "gripL" && end !== "gripR") continue
          const s = end === "gripL" ? "L" : "R"
          const g = rig.anchor(end)
          const hand = new VertexGrid(body, body.partVerts[PARTS.indexOf(`hand${s}`)])
          const near = hand.nearest(g.x, g.y, g.z).dist
          if (near > 0.035 + r) add(at, "grip", `${p.type} not in hand${s}`, cm(near))
          if ((c[`grip${s}`] ?? 0) < 0.6)
            add(at, "grip", `hand${s} open on ${p.type}`, c[`grip${s}`] ?? 0)
        }
        if (p.type === "bar" && p.from === "gripL" && p.to === "gripR") {
          const l = rig.anchor("gripL")
          const rr = rig.anchor("gripR")
          if (Math.abs(l.y - rr.y) > 0.01) add(at, "bar", "bar not level", cm(Math.abs(l.y - rr.y)))
          gripWidths.push(l.distanceTo(rr))
        }
      }

      // ---- pulleys and boxes vs every vertex
      const inv = new Quaternion()
      const local = new Vector3()
      for (const p of props) {
        if (p.type === "pulley") {
          const near = all.nearest(...p.position, 4)
          if (near.dist < PULLEY_RADIUS)
            add(
              at,
              "prop",
              `pulley through ${PARTS[body.part[near.index]]}`,
              cm(PULLEY_RADIUS - near.dist)
            )
        }
        if (p.type !== "box") continue
        inv.copy(boxRotation(p)).invert()
        const half = p.size.map((s) => s / 2)
        const tol = p.contact ? { seat: 0.02, back: 0.015, feet: 0.012 }[p.contact] : 0.008
        const worst = new Map<number, number>()
        let restGap = Infinity
        const restParts =
          p.contact === "seat"
            ? ["torso", "thighL", "thighR"]
            : p.contact === "back"
              ? ["torso"]
              : ["footL", "footR"]
        const footGap: Record<string, number> = { footL: Infinity, footR: Infinity }
        for (let i = 0; i < body.count; i++) {
          local
            .set(
              P[i * 3] - p.position[0],
              P[i * 3 + 1] - p.position[1],
              P[i * 3 + 2] - p.position[2]
            )
            .applyQuaternion(inv)
          const dx = half[0] - Math.abs(local.x)
          const dy = half[1] - Math.abs(local.y)
          const dz = half[2] - Math.abs(local.z)
          const depth = Math.min(dx, dy, dz)
          if (depth > tol) worst.set(body.part[i], Math.max(worst.get(body.part[i]) ?? 0, depth))
          const part = PARTS[body.part[i]]
          if (p.contact && restParts.includes(part)) {
            // distance from the box surface (0 when touching or inside)
            const out = Math.hypot(Math.max(-dx, 0), Math.max(-dy, 0), Math.max(-dz, 0))
            if (p.contact === "seat") {
              if (dx > 0 && dz > 0) restGap = Math.min(restGap, Math.max(local.y - half[1], 0))
            } else if (p.contact === "back") restGap = Math.min(restGap, out)
            else footGap[part] = Math.min(footGap[part], out)
          }
        }
        const name = p.contact ? `${p.contact} box` : `box #${props.indexOf(p)}`
        for (const [part, depth] of worst)
          add(at, "prop", `${name} through ${PARTS[part]}`, cm(depth))
        if (p.contact === "seat" && restGap > 0.02)
          add(at, "seat", "hips float above the seat", cm(restGap))
        if (p.contact === "back" && restGap > 0.025)
          add(at, "seat", "back off the backrest", cm(restGap))
        if (p.contact === "feet")
          for (const [foot, gap] of Object.entries(footGap))
            if (gap > 0.02) add(at, "feet", `${foot} off the foot plate`, cm(gap))
      }

      // ---- floor + planted feet
      let minY = Infinity
      const footMin: Record<string, number> = { footL: Infinity, footR: Infinity }
      for (let i = 0; i < body.count; i++) {
        const y = P[i * 3 + 1]
        minY = Math.min(minY, y)
        const part = PARTS[body.part[i]]
        if (part === "footL" || part === "footR") footMin[part] = Math.min(footMin[part], y)
      }
      if (minY < -0.01) add(at, "floor", "body below the floor", cm(-minY))
      const onPlate = props.some((p) => p.type === "box" && p.contact === "feet")
      if (m.feet === "free" && Math.min(footMin.footL, footMin.footR) > 0.015)
        add(at, "feet", "both feet in the air", cm(Math.min(footMin.footL, footMin.footR)))
      if ((m.feet ?? "planted") === "planted") {
        if (!onPlate)
          for (const [foot, y] of Object.entries(footMin))
            if (y > 0.015) add(at, "feet", `${foot} lifts off the floor`, cm(y))
        for (const s of ["l", "r"]) {
          const ball = model.getObjectByName(`ball_${s}`)!.getWorldPosition(new Vector3())
          ballStart[s] ??= ball
          const drift = ball.distanceTo(ballStart[s])
          if (drift > 0.012) add(at, "feet", `foot_${s} slides`, cm(drift))
        }
      }

      // ---- body vs body
      const grids = new Map<number, VertexGrid>()
      const gridOf = (pi: number) => {
        let g = grids.get(pi)
        if (!g) grids.set(pi, (g = new VertexGrid(body, body.partVerts[pi])))
        return g
      }
      for (const [pa, pb, tol] of SELF_PAIRS) {
        const ia = PARTS.indexOf(pa)
        const ib = PARTS.indexOf(pb)
        const gb = gridOf(ib)
        if (!gridOf(ia).overlaps(gb, 0.02)) continue
        let worst = 0
        for (const i of body.partVerts[ia]) {
          if (body.seam[i]) continue
          const { index, d } = gb.signed(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 1)
          if (index < 0 || body.seam[index]) continue
          if (-d > tol) worst = Math.max(worst, -d - tol)
        }
        if (worst > 0) add(at, "self", `${pa} into ${pb}`, cm(worst))
      }

      // ---- skin distortion (broken twists, collapsed joints): a single sliver triangle in a
      // crease is normal for skinning; a patch of them (SKIN_PATCH of a part) is visible
      const bad = new Map<number, { collapse: number; stretch: number; total: number }>()
      for (let t = 0; t < body.restArea.length; t++) {
        const rest = body.restArea[t]
        if (rest < 1e-7) continue
        const ratio = body.triangleArea(t) / rest
        const part = body.part[body.triangles[t * 3]]
        const b = bad.get(part) ?? { collapse: 0, stretch: 0, total: 0 }
        b.total++
        if (ratio < SKIN_MIN_AREA) b.collapse++
        if (ratio > SKIN_MAX_AREA) b.stretch++
        bad.set(part, b)
      }
      for (const [part, b] of bad) {
        if (b.collapse / b.total > SKIN_PATCH)
          add(at, "skin", `skin collapses at ${PARTS[part]}`, round((100 * b.collapse) / b.total))
        if (b.stretch / b.total > SKIN_PATCH)
          add(at, "skin", `skin stretches at ${PARTS[part]}`, round((100 * b.stretch) / b.total))
      }
    }
    if (gripWidths.length) {
      const spread = Math.max(...gripWidths) - Math.min(...gripWidths)
      if (spread > 0.02) add(0, "bar", "grip width changes on a rigid bar", cm(spread))
    }
  }
  return issues
}

function checkRom(c: Channels, report: (what: string, amount: number) => void) {
  for (const [k, v] of Object.entries(c)) {
    const range = ROM[romKey(k)]
    if (!range) continue
    if (v < range[0] - 0.5) report(`${k} ${round(v)}° < ${range[0]}°`, round(range[0] - v))
    if (v > range[1] + 0.5) report(`${k} ${round(v)}° > ${range[1]}°`, round(v - range[1]))
  }
}

const cm = (m: number) => Math.round(m * 1000) / 10
const round = (x: number) => Math.round(x * 100) / 100

/** Collapse frame-by-frame issues into one line per problem with its phase range and worst value. */
export function summarize(issues: Issue[]): string[] {
  const groups = new Map<string, Issue[]>()
  for (const i of issues) {
    const k = `${i.movement} [${i.variant}] ${i.kind}: ${i.what.replace(/-?\d+(\.\d+)?°( [<>])?/, "")}`
    groups.set(k, [...(groups.get(k) ?? []), i])
  }
  return [...groups].map(([k, list]) => {
    const worst = list.reduce((a, b) => (b.amount > a.amount ? b : a))
    const ats = list.map((i) => i.at)
    return `${k} — worst ${worst.amount} at ${worst.at} (frames ${Math.min(...ats)}–${Math.max(...ats)}, ${list.length}×)`
  })
}
