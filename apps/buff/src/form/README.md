# Form demos (`/form`)

Good-vs-bad technique demos: two rigged bodies play the same movement side by side, with the body part that matters glowing.

```
form/
  types.ts        data model + the joint-angle conventions (read this first)
  pose.ts         helpers: sym(), side(), mirror(), merge(), rep(), grips(), poles(), sampling
  bases.ts        shared starting positions: standing, seated(), seatProps(), SEAT_HEIGHT
  rig.ts          joint angles → bone rotations, arm IK, grounding, shoulder/twist measures
  props.ts        equipment geometry in world space (shared by viewer and checks)
  torso.ts        torso cross-sections, so a band wraps round the body instead of through it
  skin.ts         CPU skinning of the mesh, labelled by body part (for the checks)
  viewer.ts       canvas, two scenes, camera, props, highlight (three.js, browser-only)
  catalog.ts      picks up every file in movements/
  movements/*.ts  one file per demo
  check/          physical-plausibility checks + tests (see below)
```

## Add a movement

1. Copy a similar file in `movements/` (e.g. `seated-cable-row.ts` for a cable exercise, `band-w-external-rotation.ts` for something standing) and give it a new `id`. The file just has to `export default` a `Movement`. The sidebar picks it up automatically, sorted by `group` and `order`.
2. Describe the positions as **joint angles in degrees** from relaxed standing. The conventions are at the top of `types.ts`. For example, `shoulder.flex: -30` means the elbow is 30° behind the body.
   - `sym({ ... })` sets both sides at once, `side("R", { ... })` sets one side, and `mirror(pose)` swaps left and right.
   - `rep(start, end)` builds a looping rep: pause, move, pause, move back.
   - Put shared settings in `base`. It is merged under every keyframe of both variants.
   - `stress` (0–1) drives the highlight from calm green to hot red. Ramp it up at the position you're warning about.
3. **If the hands hold equipment, place the hands, not the arm angles.** Give each keyframe the
   grip positions with `grips(x, y, z)` (both hands, mirrored) or `reachL` / `reachR`, plus the
   elbow direction with `poles(x, y, z)`. The rig solves the shoulder and elbow (arm IK), so a bar
   stays rigid and level and the hands can't drift off it or into the body. Put the bar where it
   physically goes: a pulldown bar hangs straight under its pulley, so it moves on a vertical line.
4. Use `standing` / `seated()` as `base`: they keep the feet on the floor (`root.ground`).
   Put a seat under `seated()` with `seatProps()` (its top is `SEAT_HEIGHT`, measured on the mesh).
   Give boxes that the body rests on `contact: "seat" | "back" | "feet"` so the checks verify it.
5. Add `props` if the movement needs equipment: boxes (seats, pads), `cable`s, a `bar` or a `band` between `"gripL"`/`"gripR"`, and `pulley`s. Cables and bars follow the hands every frame.
6. Run `bun run test` in `apps/buff`. Every movement is checked at 50 frames per loop, for both
   variants, on the real skinned mesh. It fails if anything is physically wrong (below).
   `FORM_REPORT=1 bun run test` prints every problem with the frames where it happens.
7. Run `bun run dev`, open `/form/<id>`, and step through with the scrubber from the Front,
   Right side and Back cameras. `?at=0.5` opens the demo paused halfway through the loop.

## What the checks catch (`check/check.ts`)

- **prop**: a bar, cable, band, pulley or box passes through the body (head, torso, limbs). A
  hand holding a bar may squeeze it a little. A band must wrap the front of the body, not the back.
- **self**: hands, forearms, upper arms or legs pass into other body parts.
- **grip**: an IK hand can't reach its target, or a held hand is open.
- **bar**: a two-handed bar tilts or changes width during the rep.
- **floor / seat / feet**: the body sinks into the floor, the hips float above or sink into a
  seat, the back leaves its backrest, or planted feet slide or lift (running uses `feet: "free"`).
- **rom**: a joint goes past a real human range. Shoulders are measured on the actual arm
  (elevation, how far behind the body, humeral rotation), not by Euler angles.
- **twist**: an elbow, wrist or hip twists about its own axis far enough to break the skin.
- **skin**: a patch of the mesh collapses or stretches (more than 3% of a body part).

`check/check.test.ts` feeds the checker deliberately broken poses (the original bar-through-head
pulldown, a hand in the belly, a 170° forearm twist, feet in the floor) to make sure it keeps
catching them.

Tips:

- With the elbow bent, shoulder **external rotation (`rot`) decides where shoulder flexion sends the forearm**. With a lot of `rot`, flexing the shoulder tips the forearm backwards. This is the trap that put the first pulldown bar through the head, and the reason to use `grips()` for anything held.
- Keep the two variants' timing identical (same `rep()` options) so they stay in sync.
- `interpolation: "smooth"` (a spline through the keyframes) suits cyclic motions like running. The default `"ease"` suits reps with pauses.

## The body model

`public/models/body.glb` is the male base body from Quaternius' **Universal Base Characters** (CC0 1.0, public domain): <https://quaternius.com/packs/universalbasecharacters.html>. It's rebuilt with `scripts/build-body-model.py` (see the header of that file).
