import { standing } from "../bases"
import { merge, rep, sym } from "../pose"
import type { Movement } from "../types"

/** elbows pinned at the sides, bent 90°, palms up, forearms pointing forward */
const start = merge(
  sym({
    shoulder: { flex: 4, abd: 9, rot: 0 },
    elbow: { flex: 90, pron: -70 },
    wrist: { flex: 0 },
    grip: 0.85
  }),
  { stress: 0 }
)

const bandW: Movement = {
  id: "band-w-external-rotation",
  title: "Band W external rotation",
  cue: "Half range — rotate the hands out only about halfway",
  group: "Shoulder",
  order: 40,
  duration: 3.2,
  base: standing,
  camera: { position: [-1.35, 2.95, 2.75], target: [0, 1.0, 0.1] },
  highlight: { bone: "upperarm_r", offset: [0, -0.02, 0.06], label: "Front of right shoulder" },
  props: [{ type: "band", from: "gripL", to: "gripR" }],
  notes: [
    "Elbows stay glued to your sides and bent to 90°. Only the forearms swing out.",
    "Rotate the hands out about halfway (roughly 45°), pause, and come back under control.",
    "Shoulder blades stay relaxed. Let them move naturally, no hard squeeze.",
    "End-range rotation with a hard squeeze cranks the front of the shoulder open. That's the position we're avoiding."
  ],
  good: {
    label: "Half range, relaxed blades",
    description:
      "Elbows at the sides, bent 90°. The hands rotate out only about halfway and the shoulder blades stay relaxed.",
    keyframes: rep(
      start,
      merge(
        sym({
          scapula: { protract: -3 },
          shoulder: { flex: 4, abd: 9, rot: 42 },
          elbow: { flex: 90, pron: -70 },
          grip: 0.85
        }),
        { stress: 0.15 }
      ),
      { out: 0.36 }
    )
  },
  bad: {
    label: "Full end-range rotation + hard squeeze",
    description:
      "The hands rotate all the way out until they're behind the elbows. The shoulder blades pinch hard, the elbows drift back and the chest lifts.",
    keyframes: rep(
      start,
      merge(
        sym({
          scapula: { protract: -20, elev: 5 },
          shoulder: { flex: -10, abd: 13, rot: 98 },
          elbow: { flex: 92, pron: -70 },
          grip: 0.85
        }),
        { spine: { flex: -7 }, neck: { flex: 5 }, stress: 1 }
      ),
      { out: 0.36 }
    )
  }
}

export default bandW
