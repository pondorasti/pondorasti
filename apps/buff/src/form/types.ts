/* ==========================================================================
   Form demos — data model
   A movement is plain data: two variants (good vs bad) made of keyframed
   poses. Poses are written as anatomical joint angles in degrees, measured
   from a relaxed standing position (arms hanging, palms facing the thighs,
   thumbs forward). Positive numbers mean:

     pelvis / spine / neck / head  flex = bend forward, side = bend to the
                                   right, twist = turn to the right
     scapula   elev = shrug up (− = shoulders down), protract = reach forward
               (− = squeeze shoulder blades together)
     shoulder  flex = raise arm forward (− = arm goes behind the body),
               abd = raise arm out to the side, rot = external rotation
               (− = internal). Measured against the ribcage.
     elbow     flex = bend, pron = turn palm down/back (− = palm up)
     wrist     flex = bend toward palm, dev = toward thumb side
     grip      0 = open hand, 1 = closed fist
     hip       flex = thigh forward, abd = thigh out, rot = toes out.
               Measured against upright, so leaning the trunk (pelvis.flex)
               doesn't swing the legs.
     knee      flex = bend
     ankle     flex = toes up (− = point the foot)
     toes      flex = toes bend up (push-off)

   root moves the whole body in metres: y = up, z = forward, x = to the left.
   stress (0–1) drives the highlight: calm green at 0, hot red at 1.
   ========================================================================== */

export type Vec3 = readonly [number, number, number]

export interface Axial {
  flex?: number
  side?: number
  twist?: number
}
export interface Scapula {
  elev?: number
  protract?: number
}
export interface BallJoint {
  flex?: number
  abd?: number
  rot?: number
}
export interface Elbow {
  flex?: number
  pron?: number
}
export interface Wrist {
  flex?: number
  dev?: number
}
export interface Hinge {
  flex?: number
}

export interface Pose {
  root?: { x?: number; y?: number; z?: number }
  pelvis?: Axial
  spine?: Axial
  neck?: Axial
  head?: Axial
  scapulaL?: Scapula
  scapulaR?: Scapula
  shoulderL?: BallJoint
  shoulderR?: BallJoint
  elbowL?: Elbow
  elbowR?: Elbow
  wristL?: Wrist
  wristR?: Wrist
  gripL?: number
  gripR?: number
  hipL?: BallJoint
  hipR?: BallJoint
  kneeL?: Hinge
  kneeR?: Hinge
  ankleL?: Hinge
  ankleR?: Hinge
  toesL?: Hinge
  toesR?: Hinge
  stress?: number
}

/** Bones of the rig that props/highlights can attach to. */
export type BoneName =
  | "pelvis"
  | "spine_01"
  | "spine_02"
  | "spine_03"
  | "neck_01"
  | "Head"
  | `${"clavicle" | "upperarm" | "lowerarm" | "hand" | "thigh" | "calf" | "foot" | "ball"}_${"l" | "r"}`

/**
 * A point on the body or in the room.
 * - [x, y, z]: fixed point in metres (y up, z forward, x to the character's left)
 * - "gripL" / "gripR": centre of the closed hand; "grips": halfway between them
 * - { bone, offset }: offset in metres from a bone, in that body part's own
 *   frame as it was in the relaxed standing pose (so [0, 0, 0.05] on
 *   upperarm_r is always "5 cm in front of the shoulder joint")
 */
export type Anchor = Vec3 | "gripL" | "gripR" | "grips" | { bone: BoneName; offset?: Vec3 }

export type Prop =
  /** a box, e.g. a seat, pad or foot plate; position = centre */
  | { type: "box"; position: Vec3; size: Vec3; rotation?: Vec3; color?: string }
  /** a cylinder between two anchors */
  | { type: "cable"; from: Anchor; to: Anchor; radius?: number; color?: string }
  /** a straight bar through two anchors, extended past them by `overhang` m */
  | { type: "bar"; from: Anchor; to: Anchor; overhang?: number; radius?: number; color?: string }
  /** an elastic band between two anchors */
  | { type: "band"; from: Anchor; to: Anchor; color?: string }
  /** a small pulley wheel */
  | { type: "pulley"; position: Vec3 }

export type Ease = "inOut" | "in" | "out" | "linear"

export interface Keyframe {
  /** time in the loop, 0–1 */
  at: number
  pose: Pose
  /** easing into the *next* keyframe (default inOut). Ignored for "smooth" */
  ease?: Ease
}

export interface Variant {
  /** short label, e.g. "Short, relaxed backswing" */
  label: string
  /** one or two sentences shown under the viewer */
  description: string
  keyframes: Keyframe[]
}

export interface Highlight {
  bone: BoneName
  offset?: Vec3
  /** radius of the glow in metres (default 0.07) */
  radius?: number
  /** label floating next to the spot, e.g. "Front of right shoulder" */
  label: string
}

export interface CameraPreset {
  position: Vec3
  target: Vec3
}

export interface Movement {
  /** url slug */
  id: string
  title: string
  /** one-line cue shown in the list and header */
  cue: string
  /** sidebar group */
  group: string
  /** sort order inside the list */
  order: number
  /** links the demo to an exercise in data.ts */
  exercise?: string
  /** seconds per loop at 1× speed */
  duration: number
  /** "ease" (default): eased moves between keyframes. "smooth": spline through them (cyclic motion like running) */
  interpolation?: "ease" | "smooth"
  /** merged under every keyframe of both variants */
  base?: Pose
  camera: CameraPreset
  highlight?: Highlight
  props?: Prop[]
  /** coaching points shown under the viewer */
  notes?: string[]
  good: Variant
  bad: Variant
}
