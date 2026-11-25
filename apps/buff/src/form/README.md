# Form demos (`/form`)

Good-vs-bad technique demos: two rigged bodies play the same movement side by side, with the body part that matters glowing.

```
form/
  types.ts        data model + the joint-angle conventions (read this first)
  pose.ts         helpers: sym(), side(), mirror(), merge(), rep(), keyframe sampling
  bases.ts        shared starting positions: standing, seated(), seatProps()
  rig.ts          joint angles → bone rotations (three.js)
  viewer.ts       canvas, two scenes, camera, props, highlight (three.js, browser-only)
  catalog.ts      picks up every file in movements/
  movements/*.ts  one file per demo
```

## Add a movement

1. Copy a similar file in `movements/` (e.g. `seated-cable-row.ts` for a cable exercise, `band-w-external-rotation.ts` for something standing) and give it a new `id`. The file just has to `export default` a `Movement`. The sidebar picks it up automatically, sorted by `group` and `order`.
2. Describe the positions as **joint angles in degrees** from relaxed standing. The conventions are at the top of `types.ts`. For example, `shoulder.flex: -30` means the elbow is 30° behind the body.
   - `sym({ ... })` sets both sides at once, `side("R", { ... })` sets one side, and `mirror(pose)` swaps left and right.
   - `rep(start, end)` builds a looping rep: pause, move, pause, move back.
   - Put shared settings in `base`. It is merged under every keyframe of both variants.
   - `stress` (0–1) drives the highlight from calm green to hot red. Ramp it up at the position you're warning about.
3. Add `props` if the movement needs equipment: boxes (seats, pads), `cable`s, a `bar` or a `band` between `"gripL"`/`"gripR"`, and `pulley`s. Cables and bars follow the hands every frame.
4. Run `bun run dev` in `apps/buff`, open `/form/<id>`, and use the **Front / Right side** camera buttons and the scrubber to check each position. `?at=0.5` opens the demo paused halfway through the loop, which is handy for checking or sharing a single frame.

Tips:

- With the elbow bent, shoulder **external rotation (`rot`) decides where shoulder flexion sends the forearm**. With a lot of `rot`, flexing the shoulder tips the forearm backwards (see the lat pulldown bottom).
- Keep the two variants' timing identical (same `rep()` options) so they stay in sync.
- `interpolation: "smooth"` (a spline through the keyframes) suits cyclic motions like running. The default `"ease"` suits reps with pauses.

## The body model

`public/models/body.glb` is the male base body from Quaternius' **Universal Base Characters** (CC0 1.0, public domain): <https://quaternius.com/packs/universalbasecharacters.html>. It's rebuilt with `scripts/build-body-model.py` (see the header of that file).
