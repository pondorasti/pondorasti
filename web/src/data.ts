/* ==========================================================================
   buff — single source of truth
   Everything the app renders (equipment, exercises, routine days, load
   targets) lives here. Routes are pure renderers over this catalog.
   Relational-by-id: day items & loads reference exercises/equipment by id.
   NOTE: must stay side-effect-free — vite.config.ts imports it to generate
   the prerender page list.
   ========================================================================== */

/* ---- Equipment (physical machines; drives gallery + detail pages) ---- */
export const equipment = {
  'freedom-rack': { name: 'Freedom Rack', br: 'Nautilus · Smith/half-rack, Olympic bar + plates, adjustable bench', photo: '/thumbs/IMG_7605.jpg' },
  'tg-press':     { name: 'Chest / Overhead Press', br: 'Technogym · dual-function machine', photo: '/thumbs/IMG_7589.jpg' },
  'tg-legpress':  { name: 'Leg Press / Calf', br: 'Technogym · dual-function machine', photo: '/thumbs/IMG_7588.jpg' },
  'tg-legext':    { name: 'Leg Extension / Curl', br: 'Technogym · dual-function machine', photo: '/thumbs/IMG_7592.jpg' },
  'tg-pulls':     { name: 'High / Low Pull', br: 'Technogym · pulldown + seated row', photo: '/thumbs/IMG_7603.jpg' },
  'nautilus-ft':  { name: 'Functional Trainer', br: 'Nautilus Instinct · dual cable towers', photo: '/thumbs/IMG_7583.jpg' },
  'total-gym':    { name: 'Glideboard', br: 'Incline rail bodyweight trainer', photo: '/thumbs/IMG_7587.jpg' },
  'back-ext':     { name: 'Back-extension Bench', br: '45° frame', photo: '/thumbs/IMG_7585.jpg' },
  'treadmill':    { name: 'Treadmill', br: 'Star Trac', photo: '/thumbs/IMG_7594.jpg' },
  'stair-climber': { name: 'Stair Climber', br: 'StairMaster Gauntlet', photo: '/thumbs/IMG_7596.jpg' },
  'rower':        { name: 'Rower', br: 'Rail / magnetic resistance', photo: '/thumbs/IMG_7595.jpg' },
  'fan-rower':    { name: 'Fan Rower', br: 'Air resistance (Assault-style)', photo: '/thumbs/IMG_7595.jpg' },
  'dip-tower':    { name: 'Dip / Knee-raise Tower', br: 'FUEL · captain’s chair — dips, vertical knee raises', photo: '/thumbs/IMG_7586.jpg' },
  'gymrax':       { name: 'Free-weight Rig', br: 'Gym Rax · hex DBs, spin-lock DBs, kettlebell, wall/med balls (8 lb / 3.6 kg), 55 cm ball, rings, foam rollers, step, bands', photo: '/thumbs/IMG_7604.jpg' },
} as const

export type EquipmentId = keyof typeof equipment
export interface Equipment { name: string; br: string; photo: string }

/* Ordering + grouping for the Equipment gallery */
export const equipmentGroups: { title: string; ids: EquipmentId[] }[] = [
  { title: 'Strength — Rack & selectorized machines', ids: ['freedom-rack', 'tg-press', 'tg-legpress', 'tg-legext', 'tg-pulls'] },
  { title: 'Functional / cable & bodyweight', ids: ['nautilus-ft', 'total-gym', 'back-ext', 'dip-tower'] },
  { title: 'Cardio', ids: ['treadmill', 'stair-climber', 'rower', 'fan-rower'] },
  { title: 'Free weights & accessories', ids: ['gymrax'] },
]

/* ---- Exercises (canonical: name, muscles, demo gif) ---- */
export const exercises = {
  'bench-press':      { name: 'Barbell Bench Press', primary: 'Chest', secondary: ['Triceps', 'Shoulders'], gif: '/anim/bench-press.gif' },
  'incline-db-press': { name: 'Incline DB Press', primary: 'Upper chest', secondary: ['Shoulders'], gif: '/anim/incline-db-press.gif' },
  'overhead-press':   { name: 'Barbell Overhead Press', primary: 'Delts', secondary: ['Triceps'], gif: '/anim/overhead-press.gif' },
  'machine-overhead-press': { name: 'Overhead Press', primary: 'Delts', secondary: ['Triceps'], gif: '/anim/machine-overhead-press.gif' },
  'lateral-raise':    { name: 'Cable Lateral Raise', primary: 'Side delts', secondary: [], gif: '/anim/lateral-raise.gif' },
  'triceps-pushdown': { name: 'Rope Triceps Pushdown', primary: 'Triceps', secondary: [], gif: '/anim/triceps-pushdown.gif' },
  'overhead-triceps': { name: 'Overhead Cable Triceps Ext.', primary: 'Triceps', secondary: ['long head'], gif: '/anim/overhead-triceps.gif' },
  'barbell-row':      { name: 'Barbell Row', primary: 'Upper back', secondary: ['Biceps'], gif: '/anim/barbell-row.gif' },
  'lat-pulldown':     { name: 'Lat Pulldown', primary: 'Lats', secondary: ['Biceps'], gif: '/anim/lat-pulldown.gif' },
  'seated-row':       { name: 'Seated Row', primary: 'Mid back', secondary: ['Biceps'], gif: '/anim/seated-row.gif' },
  'face-pull':        { name: 'Face Pull', primary: 'Rear delts', secondary: ['Traps'], gif: '/anim/face-pull.gif' },
  'incline-curl':     { name: 'Incline DB Curl', primary: 'Biceps', secondary: [], gif: '/anim/incline-curl.gif' },
  'hammer-curl':      { name: 'Hammer / Rope Curl', primary: 'Biceps', secondary: ['Forearms'], gif: '/anim/hammer-curl.gif' },
  'squat':            { name: 'Barbell Squat', primary: 'Quads', secondary: ['Glutes', 'Hams'], gif: '/anim/squat.gif' },
  'leg-press':        { name: 'Leg Press', primary: 'Quads', secondary: ['Glutes'], gif: '/anim/leg-press.gif' },
  'leg-extension':    { name: 'Leg Extension', primary: 'Quads', secondary: [], gif: '/anim/leg-extension.gif' },
  'leg-curl':         { name: 'Leg Curl', primary: 'Hamstrings', secondary: [], gif: '/anim/leg-curl.gif' },
  'calf-raise':       { name: 'Calf Raise', primary: 'Calves', secondary: [], gif: '/anim/calf-raise.gif' },
  'rdl':              { name: 'Barbell Romanian Deadlift', primary: 'Hamstrings', secondary: ['Glutes'], gif: '/anim/rdl.gif' },
} as const

export type ExerciseId = keyof typeof exercises
export interface Exercise { name: string; primary: string; secondary: readonly string[]; gif: string }

/* ---- Routine days ----
   Each item references an exercise (ex) + the equipment used (gear).
   `equip` is the human "what you use" label; name/primary/secondary
   override the exercise defaults only when the day differs. */
export interface DayItem {
  ex?: ExerciseId
  name?: string
  primary?: string
  secondary?: readonly string[]
  /** short setup cue shown after the canonical equipment name */
  hint?: string
  gear: EquipmentId
  sets: string
  star?: boolean
}
export interface Day {
  id: string
  slug: string
  name: string
  focus: string
  sets: number
  time: string
  items: DayItem[]
}

export const days: Day[] = [
  { id: 'd1', slug: 'push', name: 'Push', focus: 'CHEST·SHLDR·TRI', sets: 19, time: '45–55 min', items: [
    { ex: 'bench-press',      gear: 'freedom-rack', sets: '4 × 5–8' },
    { ex: 'incline-db-press', gear: 'freedom-rack', hint: 'incline bench + DBs', sets: '3 × 8–12' },
    { ex: 'machine-overhead-press', gear: 'tg-press', sets: '3 × 8–12' },
    { ex: 'lateral-raise',    gear: 'nautilus-ft',  hint: 'single-arm', sets: '4 × 12–20', star: true },
    { ex: 'triceps-pushdown', gear: 'nautilus-ft',  hint: 'rope', sets: '3 × 10–15' },
    { ex: 'overhead-triceps', gear: 'nautilus-ft',  hint: 'rope, overhead', sets: '2 × 12–15' },
  ]},
  { id: 'd2', slug: 'pull', name: 'Pull', focus: 'BACK·BI·R.DELT', sets: 20, time: '50–60 min', items: [
    { ex: 'barbell-row',  gear: 'freedom-rack', sets: '4 × 6–10' },
    { ex: 'lat-pulldown', gear: 'tg-pulls',     hint: 'high pull', sets: '4 × 8–12' },
    { ex: 'seated-row',   gear: 'tg-pulls',     hint: 'low pull', sets: '3 × 8–12' },
    { ex: 'face-pull',    gear: 'nautilus-ft',  hint: 'rope', sets: '3 × 15–20', star: true },
    { ex: 'incline-curl', gear: 'freedom-rack', hint: 'incline bench + DBs', sets: '3 × 10–12' },
    { ex: 'hammer-curl',  gear: 'gymrax',       hint: 'DBs or cable', sets: '3 × 10–12' },
  ]},
  { id: 'd3', slug: 'legs', name: 'Legs', focus: 'QUAD·HAM·CALF', sets: 17, time: '50–60 min', items: [
    { ex: 'squat',         gear: 'freedom-rack', sets: '4 × 5–8' },
    { ex: 'leg-press',     gear: 'tg-legpress',  sets: '3 × 10–12' },
    { ex: 'leg-extension', gear: 'tg-legext',    sets: '3 × 12–15' },
    { ex: 'leg-curl',      gear: 'tg-legext',    sets: '3 × 10–12' },
    { ex: 'calf-raise',    gear: 'tg-legpress',  hint: 'calf setting', sets: '4 × 12–20' },
  ]},
  { id: 'd4', slug: 'upper', name: 'Upper', focus: 'DELT/ARM', sets: 23, time: '55–60 min', items: [
    { ex: 'overhead-press', gear: 'freedom-rack', sets: '4 × 6–10' },
    { ex: 'lat-pulldown',   gear: 'tg-pulls', hint: 'high pull, wide grip', sets: '3 × 10–12' },
    { name: 'Incline Chest Press', primary: 'Upper chest', secondary: ['Shoulders'], gear: 'freedom-rack', hint: 'incline bench, or machine', sets: '3 × 8–12' },
    { ex: 'lateral-raise',  gear: 'nautilus-ft', hint: 'single-arm', sets: '4 × 15–20', star: true },
    { ex: 'seated-row',     gear: 'tg-pulls', hint: 'low pull', sets: '3 × 10–12' },
    { name: 'Superset: Curl + Pushdown', primary: 'Biceps', secondary: ['Triceps'], gear: 'nautilus-ft', sets: '3 × 12 ea' },
    { ex: 'face-pull',      gear: 'nautilus-ft', hint: 'rope', sets: '3 × 20' },
  ]},
  { id: 'd5', slug: 'lower-plus', name: 'Lower+', focus: 'LEG·ARM·CORE', sets: 22, time: '55–60 min', items: [
    { ex: 'rdl',           gear: 'freedom-rack', sets: '4 × 6–10' },
    { ex: 'leg-press',     gear: 'tg-legpress', hint: 'wide stance', sets: '3 × 10–12' },
    { ex: 'leg-curl',      gear: 'tg-legext',   sets: '3 × 12' },
    { ex: 'leg-extension', gear: 'tg-legext',   sets: '3 × 15' },
    { ex: 'calf-raise',    gear: 'tg-legpress', hint: 'calf setting', sets: '4 × 15' },
    { name: 'Arm Giant Set: Curl+Hammer+OH Tri', primary: 'Biceps', secondary: ['Triceps'], gear: 'gymrax', hint: 'cables / DBs', sets: '3–4 rds' },
    { name: 'Core: Rollout · Knee Raise · Crunch', primary: 'Core', secondary: ['Abs'], gear: 'gymrax', hint: 'rings, cable', sets: '3 × 10–15' },
  ]},
]

/* ---- Load targets (grouped; rows with `ex` link to the exercise page) ---- */
export interface LoadRow {
  name: string
  trains: string
  start: string
  target: string
  /** one or more exercises this target applies to */
  ex?: ExerciseId | readonly ExerciseId[]
  star?: boolean
}
export interface LoadGroup { title: string; rows: LoadRow[] }

export const loads: LoadGroup[] = [
  { title: 'Barbell compounds — Freedom Rack', rows: [
    { name: 'Bench Press',       trains: 'Chest',          start: '25 kg / 55 lb', target: '45 kg / 100 lb', ex: 'bench-press' },
    { name: 'Squat',             trains: 'Quads / glutes', start: '30 kg / 66 lb', target: '65 kg / 143 lb', ex: 'squat' },
    { name: 'Barbell Overhead Press', trains: 'Shoulders', start: '20 kg / 44 lb (bar)', target: '30 kg / 66 lb', ex: 'overhead-press' },
    { name: 'Barbell Row',       trains: 'Back',           start: '25 kg / 55 lb', target: '45 kg / 100 lb', ex: 'barbell-row' },
    { name: 'Romanian Deadlift', trains: 'Hams / glutes',  start: '30 kg / 66 lb', target: '65 kg / 143 lb', ex: 'rdl' },
  ]},
  { title: 'Machine & cable accessories', rows: [
    { name: 'Overhead Press', trains: 'Shoulders', start: '10 kg / 22 lb', target: '25 kg / 55 lb', ex: 'machine-overhead-press' },
    { name: 'Lat Pulldown',  trains: 'Back',       start: '25 kg / 55 lb',  target: '45 kg / 100 lb',  ex: 'lat-pulldown' },
    { name: 'Seated Row',    trains: 'Back',       start: '25 kg / 55 lb',  target: '45 kg / 100 lb',  ex: 'seated-row' },
    { name: 'Leg Press',     trains: 'Quads',      start: '30 kg / 66 lb', target: '60 kg / 132 lb', ex: 'leg-press' },
    { name: 'Leg Extension', trains: 'Quads',      start: '14 kg / 31 lb',  target: '27 kg / 60 lb',  ex: 'leg-extension' },
    { name: 'Leg Curl',      trains: 'Hamstrings', start: '20 kg / 44 lb',  target: '40 kg / 88 lb',   ex: 'leg-curl' },
    { name: 'Calf Raise',    trains: 'Calves',     start: '27 kg / 60 lb',  target: '50 kg / 110 lb',  ex: 'calf-raise' },
    { name: 'Incline DB Press', trains: 'Upper chest · per DB', start: '7 kg / 15 lb', target: '14 kg / 30 lb', ex: 'incline-db-press' },
    { name: 'Cable Lateral', trains: 'Side delts · per arm', start: '2.5 kg / 5 lb', target: '5 kg / 11 lb', ex: 'lateral-raise', star: true },
    { name: 'Face Pull',     trains: 'Rear delts', start: '9 kg / 20 lb',  target: '18 kg / 40 lb',   ex: 'face-pull', star: true },
    { name: 'Curl',          trains: 'Biceps · cable/DB', start: '7 kg / 15 lb', target: '12 kg / 26 lb', ex: ['incline-curl', 'hammer-curl'] },
    { name: 'Rope Pushdown', trains: 'Triceps',    start: '9 kg / 20 lb',  target: '18 kg / 40 lb',   ex: 'triceps-pushdown' },
    { name: 'Overhead Triceps Ext.', trains: 'Triceps · long head', start: '7 kg / 15 lb', target: '14 kg / 30 lb', ex: 'overhead-triceps' },
  ]},
]

/* ---- Weekly schedule (Overview chips + Routine day selector) ---- */
export interface WeekEntry { d: string; slug?: string; name?: string }
export const week: WeekEntry[] = [
  { d: 'Mon', slug: 'push', name: 'Push' },
  { d: 'Tue', slug: 'pull', name: 'Pull' },
  { d: 'Wed', slug: 'legs', name: 'Legs' },
  { d: 'Thu' },
  { d: 'Fri', slug: 'upper', name: 'Upper' },
  { d: 'Sat', slug: 'lower-plus', name: 'Lower+' },
  { d: 'Sun' },
]

export const db = { equipment, equipmentGroups, exercises, days, loads, week }

/* ---- Derived relations ---- */
export const getDayBySlug = (slug: string): Day | undefined =>
  days.find((d) => d.slug === slug)

export const getExercise = (id: string): (Exercise & { id: ExerciseId }) | undefined =>
  id in exercises ? { id: id as ExerciseId, ...exercises[id as ExerciseId] } : undefined

export const getEquipment = (id: string): (Equipment & { id: EquipmentId }) | undefined =>
  id in equipment ? { id: id as EquipmentId, ...equipment[id as EquipmentId] } : undefined

/** Which days use this exercise, with the day-specific item (sets, overrides). */
export const exerciseUsage = (id: ExerciseId) =>
  days.flatMap((day) => day.items.filter((i) => i.ex === id).map((item) => ({ day, item })))

/** Which day items use this equipment. */
export const equipmentUsage = (id: EquipmentId) =>
  days.flatMap((day) => day.items.filter((i) => i.gear === id).map((item) => ({ day, item })))

/** Ids a load row applies to (normalizes single vs multi). */
export const loadRowExercises = (r: LoadRow): readonly ExerciseId[] =>
  r.ex === undefined ? [] : Array.isArray(r.ex) ? r.ex : [r.ex as ExerciseId]

/** Load targets attached to this exercise. */
export const loadsForExercise = (id: ExerciseId): LoadRow[] =>
  loads.flatMap((g) => g.rows.filter((r) => loadRowExercises(r).includes(id)))

/* ---- Item display helpers ---- */
export const itemName = (i: DayItem): string => i.name ?? (i.ex ? exercises[i.ex].name : '')
export const itemPrimary = (i: DayItem): string => i.primary ?? (i.ex ? exercises[i.ex].primary : '')
export const itemSecondary = (i: DayItem): readonly string[] =>
  i.secondary ?? (i.ex ? exercises[i.ex].secondary : [])
