/** Deploy gate: every route derivable from the data catalog must exist in
    dist/client — the prerenderer can silently drop pages on transient
    localhost fetch errors, and failOnError does not catch retried-then-
    dropped pages. Run after build, before hunk push. */
import { existsSync } from 'node:fs'
import { db } from '../src/data'

const pages = [
  '',
  'routine',
  'loads',
  'equipment',
  ...db.days.map((d) => `routine/${d.slug}`),
  ...Object.keys(db.equipment).map((id) => `equipment/${id}`),
  ...Object.keys(db.exercises).map((id) => `exercise/${id}`),
]

const missing = pages.filter((p) => !existsSync(`dist/client/${p ? `${p}/` : ''}index.html`))

if (missing.length > 0) {
  console.error(`✗ build incomplete — missing ${missing.length} page(s): ${missing.join(', ')}`)
  process.exit(1)
}
console.log(`✓ build complete: all ${pages.length} pages present`)
