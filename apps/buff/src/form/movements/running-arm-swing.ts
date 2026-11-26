import { standing } from "../bases"
import { merge, mirror, side, type Limbs } from "../pose"
import type { Movement, Pose } from "../types"

/* One stride cycle running in place (think treadmill). Four keyframes,
   splined so nothing stops:
     0.00  right toe-off, left knee drives forward   → right arm forward
     0.25  left mid-stance, right leg folds through  → arms passing the hips
     0.50  mirror of 0.00                            → right arm at its backswing
     0.75  mirror of 0.25                                                  */

const pushOffR_driveL: Pose = {
  hipR: { flex: -16, abd: 2 },
  kneeR: { flex: 24 },
  ankleR: { flex: -18 },
  toesR: { flex: 30 },
  hipL: { flex: 52, abd: 2 },
  kneeL: { flex: 88 },
  ankleL: { flex: 8 }
}
const stanceL_swingR: Pose = {
  hipL: { flex: 14, abd: 2 },
  kneeL: { flex: 40 },
  ankleL: { flex: 24 },
  hipR: { flex: 18, abd: 2 },
  kneeR: { flex: 108 },
  ankleR: { flex: -6 }
}

interface Arm extends Limbs {
  /** trunk twist that goes with the right arm being here (shoulders follow the arms) */
  twist: number
  stress: number
}

function stride(fwd: Arm, mid: Arm, back: Arm): Movement["good"]["keyframes"] {
  const trunk = (twist: number): Pose => ({
    spine: { flex: 5, twist },
    pelvis: { twist: -twist * 0.4 },
    neck: { twist: -twist * 0.7, flex: -3 }
  })
  const arm = (s: "L" | "R", a: Arm): Pose => {
    const { twist: _t, stress: _s, ...limbs } = a
    return side(s, limbs)
  }
  return [
    {
      at: 0,
      pose: merge(pushOffR_driveL, arm("R", fwd), arm("L", back), trunk(fwd.twist), {
        stress: fwd.stress
      })
    },
    {
      at: 0.25,
      pose: merge(stanceL_swingR, arm("R", mid), arm("L", mid), trunk(0), { stress: mid.stress })
    },
    {
      at: 0.5,
      pose: merge(mirror(pushOffR_driveL), arm("R", back), arm("L", fwd), trunk(-fwd.twist), {
        stress: back.stress
      })
    },
    {
      at: 0.75,
      pose: merge(mirror(stanceL_swingR), arm("R", mid), arm("L", mid), trunk(0), {
        stress: mid.stress
      })
    }
  ]
}

const runningArmSwing: Movement = {
  id: "running-arm-swing",
  title: "Running arm swing",
  cue: "Short, relaxed backswing — elbow only back to your side",
  group: "Running",
  order: 10,
  duration: 0.95,
  interpolation: "smooth",
  // running in place: the body is grounded through whichever sole is lowest; feet move
  feet: "free",
  base: merge(standing, { spine: { flex: 5 } }),
  camera: { position: [-3.3, 1.35, 1.1], target: [0, 0.98, 0] },
  highlight: {
    bone: "upperarm_r",
    offset: [0, -0.02, 0.06],
    label: "Front of right shoulder"
  },
  notes: [
    "Elbows stay bent around 90° the whole time — don't let the arm straighten on the way back.",
    "On the backswing the elbow comes back to your side, not behind you. Think “hands brush your hips”.",
    "Hands stay low (between waist and lower ribs) and relaxed, like holding a crisp without breaking it.",
    "The big backswing pulls the front of the shoulder into a stretch every single stride — thousands of reps per run."
  ],
  good: {
    label: "Short, relaxed backswing",
    description:
      "Elbows bent ~90°, hands low and loose. The elbow swings back only to the side of the body, so the front of the shoulder never gets stretched.",
    keyframes: stride(
      {
        shoulder: { flex: 20, abd: 9, rot: -6 },
        elbow: { flex: 80, pron: -10 },
        wrist: { flex: 5 },
        grip: 0.5,
        scapula: { protract: 3 },
        twist: -4,
        stress: 0
      },
      {
        shoulder: { flex: 5, abd: 9, rot: -5 },
        elbow: { flex: 86, pron: -10 },
        grip: 0.5,
        twist: 0,
        stress: 0.05
      },
      {
        shoulder: { flex: -12, abd: 9, rot: -3 },
        elbow: { flex: 84, pron: -10 },
        grip: 0.5,
        scapula: { protract: -3 },
        twist: 4,
        stress: 0.12
      }
    )
  },
  bad: {
    label: "Big backswing",
    description:
      "The elbow drives far behind the body and opens up, the shoulder blade pinches back and the front of the shoulder is yanked into a stretch on every stride.",
    keyframes: stride(
      {
        shoulder: { flex: 42, abd: 12, rot: -18 },
        elbow: { flex: 112, pron: -5 },
        wrist: { flex: 5 },
        grip: 0.55,
        scapula: { protract: 6, elev: 4 },
        twist: -9,
        stress: 0.1
      },
      {
        shoulder: { flex: -6, abd: 12, rot: -8 },
        elbow: { flex: 86, pron: -5 },
        grip: 0.55,
        twist: 0,
        stress: 0.35
      },
      {
        shoulder: { flex: -52, abd: 16, rot: -4 },
        elbow: { flex: 66, pron: -5 },
        grip: 0.55,
        scapula: { protract: -14, elev: 7 },
        twist: 9,
        stress: 1
      }
    )
  }
}

export default runningArmSwing
