import { seated, seatProps } from "../bases"
import { merge, rep, sym } from "../pose"
import type { Movement } from "../types"

const SEAT = 0.42

/** arms long, reaching to the handle — same for both variants */
const reach = merge(
  sym({
    scapula: { protract: 10 },
    shoulder: { flex: 76, abd: -14, rot: -6 },
    elbow: { flex: 10, pron: 0 },
    wrist: { flex: 0 },
    grip: 0.9
  }),
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
  base: merge(seated(SEAT, { hip: 84, knee: 34 }), sym({ ankle: { flex: 0 } })),
  camera: { position: [-3.45, 1.5, 0.95], target: [0, 0.8, 0.28] },
  highlight: { bone: "upperarm_r", offset: [0, -0.02, 0.06], label: "Front of right shoulder" },
  props: [
    ...seatProps(SEAT, { depth: 0.5, z: 0.05 }),
    // foot plate, angled so the soles sit flat on it
    { type: "box", position: [0, 0.2, 0.86], size: [0.46, 0.3, 0.04], rotation: [-28, 0, 0] },
    { type: "box", position: [0, 0.12, 0.62], size: [0.08, 0.24, 0.6] },
    { type: "box", position: [0, 0.5, 1.2], size: [0.18, 1.0, 0.1] },
    { type: "pulley", position: [0, 0.82, 1.15] },
    { type: "cable", from: "grips", to: [0, 0.82, 1.15] },
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
        sym({
          scapula: { protract: -7 },
          shoulder: { flex: -2, abd: 8, rot: -24 },
          elbow: { flex: 102, pron: 0 },
          grip: 0.9
        }),
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
        sym({
          scapula: { protract: -18, elev: 7 },
          shoulder: { flex: -40, abd: 14, rot: -22 },
          elbow: { flex: 118, pron: 0 },
          grip: 0.9
        }),
        { spine: { flex: -6 }, pelvis: { flex: -14 }, neck: { flex: 8 }, stress: 1 }
      ),
      { out: 0.36 }
    )
  }
}

export default seatedRow
