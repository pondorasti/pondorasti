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
import { Bone, Object3D, Quaternion, Vector3 } from "three"
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
  }

  has(name: string) {
    return this.byName.has(name)
  }

  /** Pose the skeleton from flat channels. */
  apply(c: Channels) {
    const parentInv = new Quaternion()
    for (const rb of this.bones) {
      rb.anat.copy(rb.anatParent ? rb.anatParent.anat : IDENTITY)
      if (rb.joint) rb.joint.fn(c, rb.joint.side ?? "L", rb.anat)
      rb.world.copy(rb.anat).multiply(rb.neutral)
      parentInv.copy(rb.parent ? rb.parent.world : this.rootParentWorld).invert()
      rb.bone.quaternion.copy(parentInv).multiply(rb.world)
    }
    // whole-body translation (sitting, bouncing): move the pelvis in world space
    const p = this.pelvis.bone
    const target = this.pelvisRestWorld
      .clone()
      .add(new Vector3(ch(c, "root.x"), ch(c, "root.y"), ch(c, "root.z")))
    p.position.copy(this.pelvis.restPos)
    if (p.parent) {
      p.parent.updateWorldMatrix(true, false)
      p.position.copy(p.parent.worldToLocal(target))
    }
    this.model.updateMatrixWorld(true)
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
