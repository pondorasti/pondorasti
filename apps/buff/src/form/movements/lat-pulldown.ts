import { seated, seatProps } from "../bases"
import { grips, merge, poles, rep, sym } from "../pose"
import type { Movement } from "../types"

/* The bar travels straight up and down under the pulley (it hangs from a cable), in front of
   the face: the hands are IK targets on that line, and the torso leans back a little so the
   face stays clear of it. */
const BAR_Z = 0.085
const HALF_GRIP = 0.4

/** bar at the upper chest — same for both variants */
const bottom = merge(
  sym({ scapula: { elev: -8, protract: -10 } }),
  grips(HALF_GRIP, 1.0, BAR_Z),
  poles(1, -1, -0.35),
  { pelvis: { flex: -14 }, neck: { flex: -4 }, stress: 0.05 }
)

const latPulldown: Movement = {
  id: "lat-pulldown-top",
  title: "Lat pulldown — top of the rep",
  cue: "Stop a few inches short: soft elbows, shoulders down",
  group: "Pull",
  order: 30,
  exercise: "lat-pulldown",
  duration: 3.6,
  base: merge(seated(), sym({ elbow: { pron: 0 }, wrist: { flex: -6 }, grip: 0.9 }), {
    spine: { flex: -2 }
  }),
  camera: { position: [-2.35, 1.55, 2.75], target: [0, 1.2, 0.05] },
  highlight: { bone: "upperarm_r", offset: [0, -0.02, 0.06], label: "Front of right shoulder" },
  props: [
    ...seatProps(),
    // thigh pad, resting on top of the thighs
    { type: "box", position: [0, 0.68, 0.25], size: [0.5, 0.08, 0.11], color: "#2a2e35" },
    { type: "box", position: [0, 0.6, 0.36], size: [0.06, 0.16, 0.06] },
    // bar + cable straight up to the top pulley
    { type: "pulley", position: [0, 2.45, BAR_Z] },
    { type: "cable", from: "grips", to: [0, 2.45, BAR_Z] },
    { type: "bar", from: "gripL", to: "gripR", overhang: 0.24 }
  ],
  notes: [
    "Let the bar rise until your arms are almost straight, then stop a few inches short.",
    "Keep a slight bend in the elbows at the top.",
    "Keep your shoulders down away from your ears, even at the top. Don't let the weight shrug you up.",
    "Lean back slightly so the bar passes in front of your face on its way to the upper chest.",
    "Hanging at full stretch with the shoulders shrugged loads the shoulder at end range."
  ],
  good: {
    label: "Stop short, elbows soft",
    description:
      "At the top the bar stops a few inches short, with a slight bend in the elbows and the shoulders kept down. The shoulder never hangs at end range.",
    keyframes: rep(
      merge(
        sym({ scapula: { elev: -3, protract: 0 } }),
        grips(HALF_GRIP, 1.46, BAR_Z),
        poles(1, -0.5, -0.1),
        { pelvis: { flex: -10 }, stress: 0.15 }
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
        sym({ scapula: { elev: 20, protract: 5 } }),
        grips(HALF_GRIP, 1.53, BAR_Z),
        poles(1, -0.3, -0.1),
        { pelvis: { flex: -9 }, neck: { flex: -6 }, stress: 1 }
      ),
      bottom,
      { pause: 0.12, out: 0.36 }
    )
  }
}

export default latPulldown
