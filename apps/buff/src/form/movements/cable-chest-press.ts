import { seated, seatProps } from "../bases"
import { grips, merge, poles, rep, sym } from "../pose"
import type { Movement } from "../types"

/* Hands are IK targets on the handles; each handle hangs from a cable running back to a
   pulley behind and to the side, at chest height. */
const PULLEY = { x: 0.72, y: 1.0, z: -0.42 }

/** arms pressed out in front — same for both variants */
const lockout = merge(
  sym({ scapula: { protract: 6 } }),
  grips(0.2, 0.98, 0.47),
  poles(1, -0.6, -0.2),
  { stress: 0 }
)

const cableChestPress: Movement = {
  id: "cable-chest-press",
  title: "Seated cable chest press",
  cue: "Short range — hands stop 1–2 fists in front of your chest",
  group: "Push",
  order: 20,
  duration: 3.4,
  base: merge(seated(), sym({ elbow: { pron: 70 }, wrist: { flex: -8 }, grip: 0.85 }), {
    spine: { flex: -3 },
    neck: { flex: 4 }
  }),
  camera: { position: [-2.7, 1.95, 1.55], target: [0, 0.95, 0.12] },
  highlight: { bone: "upperarm_r", offset: [0, -0.02, 0.06], label: "Front of right shoulder" },
  props: [
    ...seatProps(undefined, { back: { z: -0.19, top: 1.08 } }),
    // cable columns behind, pulleys at chest height
    { type: "box", position: [-PULLEY.x - 0.05, 1.0, PULLEY.z], size: [0.07, 2.0, 0.07] },
    { type: "box", position: [PULLEY.x + 0.05, 1.0, PULLEY.z], size: [0.07, 2.0, 0.07] },
    { type: "pulley", position: [-PULLEY.x, PULLEY.y, PULLEY.z] },
    { type: "pulley", position: [PULLEY.x, PULLEY.y, PULLEY.z] },
    // each cable runs from the handle's outer end (by the little finger) back to its pulley
    {
      type: "cable",
      from: { bone: "hand_r", offset: [0.03, -0.075, -0.09] },
      to: [-PULLEY.x, PULLEY.y, PULLEY.z]
    },
    {
      type: "cable",
      from: { bone: "hand_l", offset: [-0.03, -0.075, -0.09] },
      to: [PULLEY.x, PULLEY.y, PULLEY.z]
    },
    {
      type: "bar",
      from: { bone: "hand_r", offset: [0.03, -0.075, 0.07] },
      to: { bone: "hand_r", offset: [0.03, -0.075, -0.06] },
      overhang: 0.02,
      radius: 0.016,
      color: "#2b2f36"
    },
    {
      type: "bar",
      from: { bone: "hand_l", offset: [-0.03, -0.075, 0.07] },
      to: { bone: "hand_l", offset: [-0.03, -0.075, -0.06] },
      overhang: 0.02,
      radius: 0.016,
      color: "#2b2f36"
    }
  ],
  notes: [
    "Press out, then only let the hands come back until they're 1–2 fists in front of your chest.",
    "Elbows stay in front of the line of your torso — if you looked down they'd still be in view.",
    "Keep your back on the pad and your shoulder blades relaxed; don't pinch them back at the bottom.",
    "Going deeper doesn't add much chest work, but it loads the front of the shoulder at its most stretched."
  ],
  good: {
    label: "Hands stop in front of the chest",
    description:
      "The handles come back to 1–2 fists in front of the chest, elbows still a little in front of the body. The front of the shoulder stays out of the stretch.",
    keyframes: rep(
      lockout,
      merge(sym({ scapula: { protract: 0 } }), grips(0.25, 0.95, 0.27), poles(1, -0.4, -0.25), {
        stress: 0.12
      }),
      { out: 0.38 }
    )
  },
  bad: {
    label: "Elbows go behind the torso",
    description:
      "The handles sink back to the chest and the elbows travel behind the body, the shoulder blades pinch and the chest pushes forward — a loaded stretch on the front of the shoulder.",
    keyframes: rep(
      lockout,
      merge(
        sym({ scapula: { protract: -14, elev: 3 } }),
        grips(0.32, 0.94, 0.06),
        poles(1, -0.3, -1),
        // chest lifts off the pad as the blades pinch back
        { spine: { flex: -9 }, pelvis: { flex: 4 }, neck: { flex: 7 }, stress: 1 }
      ),
      { out: 0.38 }
    )
  }
}

export default cableChestPress
