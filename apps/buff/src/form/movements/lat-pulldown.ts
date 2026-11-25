import { seated, seatProps } from "../bases"
import { merge, rep, sym } from "../pose"
import type { Movement } from "../types"

const SEAT = 0.47

/** bar at the upper chest — same for both variants */
const bottom = merge(
  sym({
    scapula: { elev: -8, protract: -10 },
    shoulder: { flex: 25, abd: 35, rot: 45 },
    elbow: { flex: 131, pron: 0 },
    wrist: { flex: -10 },
    grip: 0.9
  }),
  { pelvis: { flex: -10 }, neck: { flex: -4 }, stress: 0.05 }
)

const latPulldown: Movement = {
  id: "lat-pulldown-top",
  title: "Lat pulldown — top of the rep",
  cue: "Stop a few inches short: soft elbows, shoulders down",
  group: "Pull",
  order: 30,
  exercise: "lat-pulldown",
  duration: 3.6,
  base: merge(seated(SEAT), { spine: { flex: -2 } }),
  camera: { position: [-2.35, 1.55, 2.75], target: [0, 1.2, 0.05] },
  highlight: { bone: "upperarm_r", offset: [0, -0.02, 0.06], label: "Front of right shoulder" },
  props: [
    ...seatProps(SEAT, { depth: 0.38 }),
    // thigh pad
    { type: "box", position: [0, 0.71, 0.27], size: [0.5, 0.09, 0.11], color: "#2a2e35" },
    { type: "box", position: [0, 0.6, 0.38], size: [0.06, 0.2, 0.06] },
    // bar + cable up to the top pulley
    { type: "pulley", position: [0, 2.45, 0.08] },
    { type: "cable", from: "grips", to: [0, 2.45, 0.08] },
    { type: "bar", from: "gripL", to: "gripR", overhang: 0.24 }
  ],
  notes: [
    "Let the bar rise until your arms are almost straight, then stop a few inches short.",
    "Keep a slight bend in the elbows at the top.",
    "Keep your shoulders down away from your ears, even at the top. Don't let the weight shrug you up.",
    "Hanging at full stretch with the shoulders shrugged loads the shoulder at end range."
  ],
  good: {
    label: "Stop short, elbows soft",
    description:
      "At the top the bar stops a few inches short, with a slight bend in the elbows and the shoulders kept down. The shoulder never hangs at end range.",
    keyframes: rep(
      merge(
        sym({
          scapula: { elev: -3, protract: 0 },
          shoulder: { flex: 12, abd: 138, rot: 74 },
          elbow: { flex: 30, pron: 0 },
          wrist: { flex: -6 },
          grip: 0.9
        }),
        { stress: 0.15 }
      ),
      bottom,
      { pause: 0.12, out: 0.36 }
    )
  },
  bad: {
    label: "Arms yanked straight, shoulders shrugged",
    description:
      "The weight pulls the arms fully straight overhead and hikes the shoulders up to the ears, so the shoulder hangs at the end of its range.",
    keyframes: rep(
      merge(
        sym({
          scapula: { elev: 20, protract: 5 },
          shoulder: { flex: 10, abd: 166, rot: 80 },
          elbow: { flex: 3, pron: 0 },
          wrist: { flex: 0 },
          grip: 0.9
        }),
        { neck: { flex: -4 }, spine: { flex: 2 }, stress: 1 }
      ),
      bottom,
      { pause: 0.12, out: 0.36 }
    )
  }
}

export default latPulldown
