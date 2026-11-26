import { seated, seatProps } from "../bases"
import { grips, merge, poles, rep, sym } from "../pose"
import type { Movement } from "../types"

/* Feet pushed against a foot plate, knees soft. The hands are IK targets on a V-handle whose
   cable runs forward, level, to a pulley at handle height. */
const ROW_LEGS = { hip: 84, knee: 34 }
/** pelvis drop that puts the hips on a seat of SEAT_HEIGHT with these leg angles (measured) */
const SEAT_DROP = -0.449
const HANDLE_Y = 0.84
/** seat top: lowest point of the hips with SEAT_DROP + 0.6 cm squish (measured) */
const ROW_SEAT = 0.415
const PULLEY: [number, number, number] = [0, HANDLE_Y, 1.2]
const HALF_HANDLE = 0.05

const FOOT_PLATE: Movement["props"] extends (infer P)[] | undefined ? P : never = {
  type: "box",
  position: [0, 0.154, 0.831],
  size: [0.56, 0.3, 0.04],
  rotation: [37.6, 0, 0],
  contact: "feet"
}

/** arms long, reaching to the handle — same for both variants */
const reach = merge(
  sym({ scapula: { protract: 10 } }),
  grips(HALF_HANDLE, HANDLE_Y - 0.01, 0.55),
  poles(1, -1, 0),
  { spine: { flex: 10 }, pelvis: { flex: 6 }, stress: 0 }
)

const seatedRow: Movement = {
  id: "seated-cable-row",
  title: "Seated cable row",
  cue: "Elbows stop at your sides — not past the body",
  group: "Pull",
  order: 35,
  exercise: "seated-row",
  duration: 3.4,
  base: merge(seated(ROW_LEGS), sym({ ankle: { flex: 0 }, elbow: { pron: 0 }, grip: 0.9 }), {
    root: { ground: 0, y: SEAT_DROP }
  }),
  camera: { position: [-3.45, 1.5, 0.95], target: [0, 0.8, 0.28] },
  highlight: { bone: "upperarm_r", offset: [0, -0.02, 0.06], label: "Front of right shoulder" },
  props: [
    ...seatProps(ROW_SEAT),
    // foot plate, angled so the soles sit flat on it (fitted to the sole points)
    FOOT_PLATE,
    { type: "box", position: [0, 0.05, 1.0], size: [0.08, 0.1, 0.4] },
    { type: "box", position: [0, 0.5, PULLEY[2] + 0.06], size: [0.18, 1.0, 0.1] },
    { type: "pulley", position: PULLEY },
    { type: "cable", from: "grips", to: PULLEY },
    { type: "bar", from: "gripL", to: "gripR", overhang: 0.025, radius: 0.016, color: "#2b2f36" }
  ],
  notes: [
    "Pull until your elbows reach your sides, in line with your torso, then stop.",
    "Sit tall and keep the torso still. No leaning back to finish the rep.",
    "A gentle shoulder-blade squeeze is fine. Driving the elbows behind you isn't.",
    "Pulling the elbows past the body tips the top of the arm bone forward, into the front of the shoulder."
  ],
  good: {
    label: "Elbows stop at your sides",
    description:
      "The handle comes to the lower ribs and the elbows stop level with the torso. The torso stays tall and still.",
    keyframes: rep(
      reach,
      merge(
        sym({ scapula: { protract: -7 } }),
        grips(HALF_HANDLE, HANDLE_Y, 0.24),
        poles(0.55, -1, -0.6),
        { spine: { flex: 0 }, pelvis: { flex: 0 }, stress: 0.15 }
      ),
      { out: 0.36 }
    )
  },
  bad: {
    label: "Elbows past the body",
    description:
      "The elbows drive well behind the torso, the shoulders shrug and roll forward, and the torso leans back to finish the rep.",
    keyframes: rep(
      reach,
      merge(
        sym({ scapula: { protract: -18, elev: 7 } }),
        grips(HALF_HANDLE, HANDLE_Y + 0.02, 0.06),
        poles(0.7, 0.15, -1),
        { spine: { flex: -6 }, pelvis: { flex: -16 }, neck: { flex: 8 }, stress: 1 }
      ),
      { out: 0.36 }
    )
  }
}

export default seatedRow
