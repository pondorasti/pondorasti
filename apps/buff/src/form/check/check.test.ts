/* The checker itself must keep catching real problems: feed it deliberately broken movements. */
import { beforeAll, describe, expect, it } from "vite-plus/test"
import type { GLTF } from "three/addons/loaders/GLTFLoader.js"
import { seated, seatProps, standing } from "../bases"
import { grips, merge, sym } from "../pose"
import type { Movement, Pose, Prop } from "../types"
import { checkMovement } from "./check"
import { loadBody } from "./load-body"

let gltf: GLTF
beforeAll(async () => {
  gltf = await loadBody()
})

/** a one-pose movement (both variants identical) */
const still = (pose: Pose, props: Prop[] = [], base: Pose = standing): Movement => {
  const v = { label: "", description: "", keyframes: [{ at: 0, pose }] }
  return {
    id: "test",
    title: "test",
    cue: "",
    group: "test",
    order: 0,
    duration: 1,
    base,
    camera: { position: [0, 1, 3], target: [0, 1, 0] },
    props,
    good: v,
    bad: v
  }
}

const kinds = (m: Movement) =>
  new Set(checkMovement(gltf.scene, m, { step: 1 }).map((i) => `${i.kind}: ${i.what}`))

describe("checker catches broken poses", () => {
  it("accepts relaxed standing", () => {
    expect([...kinds(still({}))]).toEqual([])
  })

  it("flags the original lat pulldown bug: bar through the head", () => {
    // angle-posed bottom of the first version: hands ended beside the ears
    const pose = merge(
      sym({
        scapula: { elev: -8, protract: -10 },
        shoulder: { flex: 14, abd: 31, rot: 80 },
        elbow: { flex: 134 },
        grip: 0.9
      }),
      { pelvis: { flex: -10 } }
    )
    const props: Prop[] = [
      ...seatProps(),
      { type: "bar", from: "gripL", to: "gripR", overhang: 0.24 }
    ]
    expect(kinds(still(pose, props, seated()))).toContain("prop: bar through head")
  })

  it("flags a hand pulled into the belly", () => {
    const m = still(merge(grips(0.05, 1.05, 0.0), sym({ grip: 0.9 })))
    expect([...kinds(m)].some((k) => /^self: hand[LR] into torso/.test(k))).toBe(true)
  })

  it("flags a broken forearm twist", () => {
    const m = still(sym({ elbow: { flex: 90, pron: 170 } }))
    const found = [...kinds(m)]
    expect(found.some((k) => k.startsWith("twist: lowerarm") || k.startsWith("rom: elbow"))).toBe(
      true
    )
  })

  it("flags feet through the floor", () => {
    expect(kinds(still({ root: { ground: 0, y: -0.05 } }))).toContain("floor: body below the floor")
  })

  it("wraps a band round the front of the body at end-range rotation, never through it", () => {
    for (const rot of [45, 75, 90]) {
      const pose = sym({ shoulder: { abd: 10, rot }, elbow: { flex: 90, pron: -70 }, grip: 0.9 })
      const found = [...kinds(still(pose, [{ type: "band", from: "gripL", to: "gripR" }]))]
      expect(found.filter((k) => k.startsWith("prop: band"))).toEqual([])
    }
  })
})
