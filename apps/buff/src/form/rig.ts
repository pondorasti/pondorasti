/* ==========================================================================
   Rig: turns anatomical joint angles (see types.ts) into bone rotations.

   The model ships in a T-pose. On load we compute a "neutral" world
   orientation N for every bone (relaxed standing: arms hanging, palms in,
   thumbs forward). In that pose every segment's anatomical axes line up
   with the body axes (x = left, y = up, z = forward), so a joint angle is
   just a rotation J about a body axis. Each frame:

     A(bone) = A(anatomical parent) · J(bone)   – segment's rotation vs neutral
     W(bone) = A(bone) · N(bone)                – world orientation
     local   = W(parent bone)⁻¹ · W(bone)

   "Anatomical parent" differs from the skeleton parent in two places so the
   numbers read like a coach would say them: the upper arm is measured
   against the ribcage (not the collarbone), and the thigh against upright
   (not the pelvis).
   ========================================================================== */
import { Bone, Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three"
import type { Anchor, BoneName } from "./types"
import type { Channels } from "./pose"

const DEG = Math.PI / 180
const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const DOWN = new Vector3(0, -1, 0)

type Side = "L" | "R"
type JointFn = (c: Channels, side: Side, q: Quaternion) => void

const tmpQ = new Quaternion()
/** q = q · R(axis, deg) */
function rot(q: Quaternion, axis: Vector3, deg: number) {
  if (deg) q.multiply(tmpQ.setFromAxisAngle(axis, deg * DEG))
}
const ch = (c: Channels, k: string) => c[k] ?? 0

/* Sign conventions, worked out for a body facing +z with its left at +x:
   rotation about +x moves a hanging limb backward, about +z moves a right-
   side limb toward the midline, about +y turns the front toward the left. */
const axialJoint =
  (name: string, share = 1): JointFn =>
  (c, _s, q) => {
    rot(q, Y, -ch(c, `${name}.twist`) * share)
    rot(q, Z, ch(c, `${name}.side`) * share)
    rot(q, X, ch(c, `${name}.flex`) * share)
  }

/** Ball joint: J = Rflex · Rabd · Rrot (axial spin first, then out, then forward). */
const ballJoint =
  (name: string): JointFn =>
  (c, s, q) => {
    const m = s === "L" ? 1 : -1
    rot(q, X, -ch(c, `${name}${s}.flex`))
    rot(q, Z, m * ch(c, `${name}${s}.abd`))
    rot(q, Y, m * ch(c, `${name}${s}.rot`))
  }

/** Forearm twist is split between forearm and hand (the rig has no twist bones). */
const PRON_FOREARM = 0.55

const JOINTS: Record<string, { fn: JointFn; side?: Side; anatParent?: string }> = {
  pelvis: { fn: axialJoint("pelvis") },
  spine_01: { fn: axialJoint("spine", 0.3) },
  spine_02: { fn: axialJoint("spine", 0.35) },
  spine_03: { fn: axialJoint("spine", 0.35) },
  neck_01: { fn: axialJoint("neck") },
  Head: { fn: axialJoint("head") }
}
for (const s of ["L", "R"] as const) {
  const b = s.toLowerCase()
  const m = s === "L" ? 1 : -1
  JOINTS[`clavicle_${b}`] = {
    side: s,
    fn: (c, _s, q) => {
      rot(q, Y, -m * ch(c, `scapula${s}.protract`))
      rot(q, Z, m * ch(c, `scapula${s}.elev`))
    }
  }
  JOINTS[`upperarm_${b}`] = { side: s, fn: ballJoint("shoulder"), anatParent: "spine_03" }
  JOINTS[`lowerarm_${b}`] = {
    side: s,
    fn: (c, _s, q) => {
      rot(q, X, -ch(c, `elbow${s}.flex`))
      rot(q, Y, -m * ch(c, `elbow${s}.pron`) * PRON_FOREARM)
    }
  }
  JOINTS[`hand_${b}`] = {
    side: s,
    fn: (c, _s, q) => {
      rot(q, Z, -m * ch(c, `wrist${s}.flex`))
      rot(q, X, -ch(c, `wrist${s}.dev`))
      rot(q, Y, -m * ch(c, `elbow${s}.pron`) * (1 - PRON_FOREARM))
    }
  }
  JOINTS[`thigh_${b}`] = { side: s, fn: ballJoint("hip"), anatParent: "" }
  JOINTS[`calf_${b}`] = { side: s, fn: (c, _s, q) => rot(q, X, ch(c, `knee${s}.flex`)) }
  JOINTS[`foot_${b}`] = { side: s, fn: (c, _s, q) => rot(q, X, -ch(c, `ankle${s}.flex`)) }
  JOINTS[`ball_${b}`] = { side: s, fn: (c, _s, q) => rot(q, X, -ch(c, `toes${s}.flex`)) }

  // Fingers: curl each phalanx toward the palm. Degrees at grip = 1.
  const curl = [70, 95, 65]
  for (const f of ["index", "middle", "ring", "pinky"]) {
    for (let i = 1; i <= 3; i++) {
      JOINTS[`${f}_0${i}_${b}`] = {
        side: s,
        fn: (c, _s, q) => rot(q, Z, -m * ch(c, `grip${s}`) * curl[i - 1])
      }
    }
  }
  JOINTS[`thumb_01_${b}`] = {
    side: s,
    fn: (c, _s, q) => {
      const g = ch(c, `grip${s}`)
      rot(q, Z, -m * g * 20)
      rot(q, Y, m * g * 25)
    }
  }
  for (let i = 2; i <= 3; i++)
    JOINTS[`thumb_0${i}_${b}`] = {
      side: s,
      fn: (c, _s, q) => rot(q, Y, m * ch(c, `grip${s}`) * 35)
    }
}

/** Which child defines a bone's direction, for bones we straighten into neutral. */
const NEUTRAL_DIR: Record<string, { child: string; target: Vector3 }> = {
  upperarm_l: { child: "lowerarm_l", target: DOWN },
  upperarm_r: { child: "lowerarm_r", target: DOWN },
  thigh_l: { child: "calf_l", target: DOWN },
  thigh_r: { child: "calf_r", target: DOWN }
}

/** Grip centre, in the hand's neutral frame (hand hanging, palm facing in). */
const GRIP_OFFSET = { L: new Vector3(-0.025, -0.075, 0.005), R: new Vector3(0.025, -0.075, 0.005) }

/** Lowest points of each sole (heel, ball, toe tip), measured on the mesh, in neutral bone frames. */
const SOLE: Record<"l" | "r", [string, Vector3][]> = { l: [], r: [] }
for (const s of ["l", "r"] as const) {
  const m = s === "l" ? -1 : 1
  SOLE[s] = [
    [`foot_${s}`, new Vector3(-0.008 * m, -0.092, -0.027)],
    [`foot_${s}`, new Vector3(0.022 * m, -0.09, -0.02)],
    [`foot_${s}`, new Vector3(-0.035 * m, -0.088, -0.02)],
    [`ball_${s}`, new Vector3(0.014 * m, -0.024, 0.003)],
    [`ball_${s}`, new Vector3(0.04 * m, -0.022, -0.005)],
    [`ball_${s}`, new Vector3(-0.04 * m, -0.02, -0.01)],
    [`ball_leaf_${s}`, new Vector3(0, -0.012, -0.012)]
  ]
}
/** The model's soles sit this far below its origin; lift it so standing feet rest on y = 0. */
const FLOOR_LIFT = 0.009

/** Default elbow direction for arm IK: down and a little out. */
const DEFAULT_POLE = { L: new Vector3(0.5, -1, -0.2), R: new Vector3(-0.5, -1, -0.2) }
const IK_ITERATIONS = 4

interface RigBone {
  bone: Bone
  name: string
  parent: RigBone | null
  anatParent: RigBone | null
  joint?: { fn: JointFn; side?: Side }
  neutral: Quaternion
  restPos: Vector3
  /** rotation vs neutral (A), recomputed each frame */
  anat: Quaternion
  world: Quaternion
}

export class Rig {
  private bones: RigBone[] = []
  private byName = new Map<string, RigBone>()
  private rootParentWorld = new Quaternion()
  private pelvis!: RigBone
  private pelvisRestWorld = new Vector3()

  /** `model` must be at the origin with no rotation/scale when constructed. */
  constructor(private model: Object3D) {
    model.updateMatrixWorld(true)
    let skeletonRoot: Bone | undefined
    model.traverse((o) => {
      if (!skeletonRoot && (o as Bone).isBone) skeletonRoot = o as Bone
    })
    if (!skeletonRoot) throw new Error("model has no skeleton")
    skeletonRoot.parent?.getWorldQuaternion(this.rootParentWorld)

    const restWorld = new Map<string, Quaternion>()
    const correction = new Map<string, Quaternion>()
    skeletonRoot.traverse((o) => {
      if (!(o as Bone).isBone) return
      const bone = o as Bone
      const q = bone.getWorldQuaternion(new Quaternion())
      restWorld.set(bone.name, q)
      const parent =
        bone.parent && (bone.parent as Bone).isBone ? this.byName.get(bone.parent.name)! : null
      const parentC = parent ? correction.get(parent.name)! : new Quaternion()
      let c = parentC.clone()
      const nd = NEUTRAL_DIR[bone.name]
      if (nd) {
        const child = model.getObjectByName(nd.child)!
        const dir = child.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3()))
        dir.applyQuaternion(parentC).normalize()
        c = new Quaternion().setFromUnitVectors(dir, nd.target).multiply(parentC)
      }
      correction.set(bone.name, c)
      const j = JOINTS[bone.name]
      const rb: RigBone = {
        bone,
        name: bone.name,
        parent,
        anatParent: parent,
        joint: j,
        neutral: c.clone().multiply(q),
        restPos: bone.position.clone(),
        anat: new Quaternion(),
        world: new Quaternion()
      }
      this.bones.push(rb)
      this.byName.set(bone.name, rb)
    })
    // resolve anatomical-parent overrides now that every bone exists
    for (const rb of this.bones) {
      const ap = JOINTS[rb.name]?.anatParent
      if (ap === undefined) continue
      rb.anatParent = ap ? this.byName.get(ap)! : null
    }
    this.pelvis = this.byName.get("pelvis")!
    this.pelvis.bone.getWorldPosition(this.pelvisRestWorld)
    this.pelvisRestWorld.y += FLOOR_LIFT
  }

  has(name: string) {
    return this.byName.has(name)
  }

  /** a body part's rotation away from relaxed standing (call after apply) */
  anatomical(name: string): Quaternion {
    return (this.byName.get(name)?.anat ?? IDENTITY).clone()
  }

  bonePosition(name: string, out = new Vector3()): Vector3 {
    const rb = this.byName.get(name)
    return rb ? rb.bone.getWorldPosition(out) : out.set(0, 0, 0)
  }

  /**
   * Pose the skeleton from flat channels. Returns the channels actually used: arm IK
   * (reachL/reachR targets) fills in the shoulder and elbow angles.
   */
  apply(input: Channels): Channels {
    const c = { ...input }
    const sides = (["L", "R"] as const).filter((s) => `reach${s}.x` in c)
    this.pose(c)
    for (let i = 0; i < IK_ITERATIONS && sides.length; i++) {
      for (const s of sides) this.solveArm(c, s, i === 0)
      this.pose(c)
    }
    return c
  }

  private pose(c: Channels) {
    const parentInv = new Quaternion()
    for (const rb of this.bones) {
      rb.anat.copy(rb.anatParent ? rb.anatParent.anat : IDENTITY)
      if (rb.joint) rb.joint.fn(c, rb.joint.side ?? "L", rb.anat)
      rb.world.copy(rb.anat).multiply(rb.neutral)
      parentInv.copy(rb.parent ? rb.parent.world : this.rootParentWorld).invert()
      rb.bone.quaternion.copy(parentInv).multiply(rb.world)
    }
    // whole-body translation (sitting, bouncing): move the pelvis in world space
    const offset = new Vector3(ch(c, "root.x"), ch(c, "root.y"), ch(c, "root.z"))
    this.placePelvis(offset)
    // root.ground: drop/raise the body so the lowest sole point is root.lift above the floor
    if (ch(c, "root.ground")) {
      let low = Infinity
      const p = new Vector3()
      for (const s of ["l", "r"] as const)
        for (const [bone, o] of SOLE[s]) low = Math.min(low, this.offsetFrom(bone, o, p).y)
      offset.y += ch(c, "root.lift") - low
      this.placePelvis(offset)
    }
  }

  private placePelvis(offset: Vector3) {
    const p = this.pelvis.bone
    p.position.copy(this.pelvis.restPos)
    if (p.parent) {
      p.parent.updateWorldMatrix(true, false)
      p.position.copy(p.parent.worldToLocal(this.pelvisRestWorld.clone().add(offset)))
    }
    this.model.updateMatrixWorld(true)
  }

  /** Target for the grip, nudged each iteration to cancel the palm offset. */
  private ikAim = { L: new Vector3(), R: new Vector3() }

  /**
   * Two-bone arm IK: put the grip on reach{s}, with the elbow bent toward pole{s}.
   * Writes shoulder flex/abd/rot and elbow flex into `c` (forearm twist and wrist stay as authored).
   */
  private solveArm(c: Channels, s: "L" | "R", first: boolean) {
    const b = s.toLowerCase()
    const target = new Vector3(c[`reach${s}.x`], c[`reach${s}.y`], c[`reach${s}.z`])
    const aim = this.ikAim[s]
    if (first) aim.copy(target)
    else aim.add(target.clone().sub(this.anchor(`grip${s}`)))

    const S = this.byName.get(`upperarm_${b}`)!.bone.getWorldPosition(new Vector3())
    const E0 = this.byName.get(`lowerarm_${b}`)!.bone.getWorldPosition(new Vector3())
    const G0 = this.anchor(`grip${s}`)
    const L1 = S.distanceTo(E0)
    const L2 = E0.distanceTo(G0)
    const toT = aim.clone().sub(S)
    const d = Math.min(Math.max(toT.length(), Math.abs(L1 - L2) + 1e-4), L1 + L2 - 1e-4)
    const a = toT.normalize()
    const pole =
      `pole${s}.x` in c
        ? new Vector3(c[`pole${s}.x`], c[`pole${s}.y`], c[`pole${s}.z`])
        : DEFAULT_POLE[s].clone()
    const perp = pole.sub(a.clone().multiplyScalar(pole.dot(a)))
    if (perp.lengthSq() < 1e-8) perp.set(0, 0, -1).sub(a.clone().multiplyScalar(-a.z))
    perp.normalize()
    const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)
    const sinA = Math.sqrt(Math.max(1 - cosA * cosA, 0))
    const u = a.clone().multiplyScalar(cosA).addScaledVector(perp, sinA) // upper arm direction
    const E = S.clone().addScaledVector(u, L1)
    const f = S.clone().addScaledVector(a, d).sub(E).normalize() // forearm direction
    let h = u.clone().cross(f)
    if (h.lengthSq() < 1e-8) h = u.clone().cross(perp).negate()
    h.normalize()
    // neutral arm: hangs along -y, flexes about -x; map that frame onto (u, h)
    const w = u.clone().cross(h)
    const target3 = new Matrix4().makeBasis(u, h, w)
    const neutral3 = new Matrix4().makeBasis(
      new Vector3(0, -1, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 0, -1)
    )
    const A = new Quaternion().setFromRotationMatrix(target3.multiply(neutral3.transpose()))
    const thorax = this.byName.get("spine_03")!.anat
    const J = thorax.clone().invert().multiply(A)
    const e = new Euler().setFromQuaternion(J, "XZY")
    const m = s === "L" ? 1 : -1
    c[`shoulder${s}.flex`] = -e.x / DEG
    c[`shoulder${s}.abd`] = (m * e.z) / DEG
    c[`shoulder${s}.rot`] = (m * e.y) / DEG
    c[`elbow${s}.flex`] = Math.acos(Math.min(Math.max(u.dot(f), -1), 1)) / DEG
  }

  /**
   * Shoulder position measured without Euler angles (which are path-dependent for raised arms):
   * elevation = angle of the upper arm from hanging, behind = how far it points behind the
   * body, rotation = external (+) / internal (−) rotation of the humerus about its own axis.
   */
  shoulder(s: "L" | "R") {
    const J = this.anatomical("spine_03")
      .invert()
      .multiply(this.anatomical(`upperarm_${s.toLowerCase()}`))
    const down = new Vector3(0, -1, 0)
    const d = down.clone().applyQuaternion(J)
    const swing = new Quaternion().setFromUnitVectors(down, d)
    const twist = swing.invert().multiply(J)
    let deg = (2 * Math.atan2(twist.y, twist.w)) / DEG
    if (deg > 180) deg -= 360
    if (deg < -180) deg += 360
    return {
      elevation: Math.acos(Math.min(Math.max(-d.y, -1), 1)) / DEG,
      behind: Math.asin(Math.min(Math.max(-d.z, 0), 1)) / DEG,
      rotation: (s === "L" ? 1 : -1) * deg
    }
  }

  /**
   * Twist (degrees) of a bone about its own long axis relative to its parent, compared with
   * relaxed standing. Large values at the elbow/wrist read as a broken "candy wrapper" twist.
   */
  twist(name: string): number {
    const rb = this.byName.get(name)
    if (!rb?.parent) return 0
    const neutralRel = rb.parent.neutral.clone().invert().multiply(rb.neutral)
    const rel = rb.parent.world.clone().invert().multiply(rb.world)
    const d = neutralRel.invert().multiply(rel)
    let deg = (2 * Math.atan2(d.y, d.w)) / DEG
    if (deg > 180) deg -= 360
    if (deg < -180) deg += 360
    return deg
  }

  /** World positions of the sole contact points of one foot (call after apply). */
  sole(side: "l" | "r"): Vector3[] {
    return SOLE[side].map(([bone, o]) => this.offsetFrom(bone, o, new Vector3()))
  }

  /** World position of an anchor (call after apply). */
  anchor(a: Anchor, out = new Vector3()): Vector3 {
    if (Array.isArray(a)) return out.set(a[0], a[1], a[2])
    if (a === "grips") {
      const l = this.anchor("gripL", new Vector3())
      return this.anchor("gripR", out).add(l).multiplyScalar(0.5)
    }
    if (a === "gripL" || a === "gripR") {
      const side = a === "gripL" ? "L" : "R"
      return this.offsetFrom(`hand_${side.toLowerCase()}`, GRIP_OFFSET[side], out)
    }
    const { bone, offset } = a as { bone: BoneName; offset?: readonly number[] }
    return this.offsetFrom(
      bone,
      offset ? new Vector3(offset[0], offset[1], offset[2]) : undefined,
      out
    )
  }

  private offsetFrom(name: string, offset: Vector3 | undefined, out: Vector3) {
    const rb = this.byName.get(name)
    if (!rb) return out.set(0, 0, 0)
    rb.bone.getWorldPosition(out)
    if (offset) out.add(offset.clone().applyQuaternion(rb.anat))
    return out
  }
}

const IDENTITY = new Quaternion()
