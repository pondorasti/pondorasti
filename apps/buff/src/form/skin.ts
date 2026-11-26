/* CPU skinning of the body (+ hair) into world-space vertices, labelled by body
   part, so the checks can measure the mesh exactly as the GPU draws it. */
import { Matrix4, Mesh, Object3D, SkinnedMesh, Vector3 } from "three"

export const PARTS = [
  "head",
  "torso",
  "upperarmL",
  "upperarmR",
  "forearmL",
  "forearmR",
  "handL",
  "handR",
  "thighL",
  "thighR",
  "calfL",
  "calfR",
  "footL",
  "footR"
] as const
export type Part = (typeof PARTS)[number]

export function partOfBone(name: string): Part {
  const side = name.endsWith("_l") ? "L" : "R"
  if (name === "Head" || name === "neck_01") return "head"
  if (name.startsWith("upperarm")) return `upperarm${side}`
  if (name.startsWith("lowerarm")) return `forearm${side}`
  if (/^(hand|thumb|index|middle|ring|pinky)_/.test(name)) return `hand${side}`
  if (name.startsWith("thigh")) return `thigh${side}`
  if (name.startsWith("calf")) return `calf${side}`
  if (name.startsWith("foot") || name.startsWith("ball")) return `foot${side}`
  return "torso" // pelvis, spine, clavicles, root
}

interface Source {
  mesh: Mesh
  start: number
  count: number
}

export class Body {
  /** world positions / normals, xyz per vertex */
  positions: Float32Array
  normals: Float32Array
  /** PARTS index per vertex */
  part: Uint8Array
  /** vertices next to a different part (seams), where per-part inside tests are unreliable */
  seam: Uint8Array
  /** triangles of the skin mesh (vertex indices into the arrays above) + their area in the baseline pose */
  triangles: Uint32Array
  restArea: Float32Array
  /** vertex indices of each part (PARTS order) */
  partVerts: number[][]
  count: number
  private sources: Source[] = []

  constructor(model: Object3D) {
    model.updateMatrixWorld(true)
    const meshes: Mesh[] = []
    model.traverse((o) => {
      const m = o as Mesh
      // the eyes/eyebrows sit inside the head and add nothing
      if (m.isMesh && m.name !== "Eyes" && m.name !== "Eyebrows") meshes.push(m)
    })
    let count = 0
    for (const mesh of meshes) {
      const n = mesh.geometry.attributes.position.count
      this.sources.push({ mesh, start: count, count: n })
      count += n
    }
    this.count = count
    this.positions = new Float32Array(count * 3)
    this.normals = new Float32Array(count * 3)
    this.part = new Uint8Array(count)
    this.seam = new Uint8Array(count)

    const tris: number[] = []
    for (const { mesh, start, count: n } of this.sources) {
      const skinned = (mesh as SkinnedMesh).isSkinnedMesh ? (mesh as SkinnedMesh) : null
      const g = mesh.geometry
      for (let i = 0; i < n; i++) {
        if (skinned) {
          const idx = g.attributes.skinIndex
          const w = g.attributes.skinWeight
          let best = 0
          for (let k = 1; k < 4; k++) if (w.getComponent(i, k) > w.getComponent(i, best)) best = k
          const bone = skinned.skeleton.bones[idx.getComponent(i, best)]
          this.part[start + i] = PARTS.indexOf(partOfBone(bone.name))
        } else {
          // rigid meshes (hair) follow the bone they're parented to
          let o: Object3D | null = mesh.parent
          while (o && !(o as { isBone?: boolean }).isBone) o = o.parent
          this.part[start + i] = PARTS.indexOf(o ? partOfBone(o.name) : "torso")
        }
      }
      if (mesh.name === "SuperHero_Male" && g.index) {
        const ix = g.index.array
        for (let t = 0; t < ix.length; t++) tris.push(start + ix[t])
      }
    }
    this.triangles = Uint32Array.from(tris)
    for (let t = 0; t < this.triangles.length; t += 3) {
      const [a, b, c] = [this.triangles[t], this.triangles[t + 1], this.triangles[t + 2]]
      const pa = this.part[a]
      if (this.part[b] !== pa || this.part[c] !== pa) this.seam[a] = this.seam[b] = this.seam[c] = 1
    }
    // widen the seam band by two rings
    for (let ring = 0; ring < 2; ring++) {
      const next = this.seam.slice()
      for (let t = 0; t < this.triangles.length; t += 3) {
        const v = [this.triangles[t], this.triangles[t + 1], this.triangles[t + 2]]
        if (v.some((x) => this.seam[x])) for (const x of v) next[x] = 1
      }
      this.seam = next
    }

    this.partVerts = PARTS.map(() => [])
    for (let i = 0; i < count; i++) this.partVerts[this.part[i]].push(i)
    this.restArea = new Float32Array(this.triangles.length / 3)
    this.update()
    this.setBaseline()
  }

  /** Remember the current triangle areas as "undistorted" (call in a known-good pose). */
  setBaseline() {
    for (let t = 0; t < this.restArea.length; t++) this.restArea[t] = this.triangleArea(t)
  }

  /** Re-skin every vertex from the current bone transforms (call after rig.apply). */
  update() {
    const v = new Vector3()
    const n = new Vector3()
    const acc = new Vector3()
    const accN = new Vector3()
    const tmp = new Vector3()
    const m = new Matrix4()
    for (const { mesh, start, count } of this.sources) {
      const g = mesh.geometry
      const pos = g.attributes.position
      const nor = g.attributes.normal
      const skinned = (mesh as SkinnedMesh).isSkinnedMesh ? (mesh as SkinnedMesh) : null
      let boneMats: Matrix4[] = []
      if (skinned) {
        skinned.skeleton.update()
        // world = matrixWorld · bindMatrixInverse · boneMatrix · bindMatrix
        const pre = new Matrix4().multiplyMatrices(skinned.matrixWorld, skinned.bindMatrixInverse)
        boneMats = skinned.skeleton.bones.map((_, i) =>
          new Matrix4()
            .fromArray(skinned.skeleton.boneMatrices!, i * 16)
            .premultiply(pre)
            .multiply(skinned.bindMatrix)
        )
      }
      for (let i = 0; i < count; i++) {
        v.fromBufferAttribute(pos, i)
        n.fromBufferAttribute(nor, i)
        if (skinned) {
          acc.set(0, 0, 0)
          accN.set(0, 0, 0)
          const idx = g.attributes.skinIndex
          const w = g.attributes.skinWeight
          for (let k = 0; k < 4; k++) {
            const wk = w.getComponent(i, k)
            if (!wk) continue
            const bm = boneMats[idx.getComponent(i, k)]
            acc.addScaledVector(tmp.copy(v).applyMatrix4(bm), wk)
            accN.addScaledVector(tmp.copy(n).transformDirection(bm), wk)
          }
          v.copy(acc)
          n.copy(accN).normalize()
        } else {
          m.copy(mesh.matrixWorld)
          v.applyMatrix4(m)
          n.transformDirection(m)
        }
        const o = (start + i) * 3
        this.positions[o] = v.x
        this.positions[o + 1] = v.y
        this.positions[o + 2] = v.z
        this.normals[o] = n.x
        this.normals[o + 1] = n.y
        this.normals[o + 2] = n.z
      }
    }
  }

  triangleArea(t: number) {
    const p = this.positions
    const [a, b, c] = [this.triangles[t * 3], this.triangles[t * 3 + 1], this.triangles[t * 3 + 2]]
    const ux = p[b * 3] - p[a * 3]
    const uy = p[b * 3 + 1] - p[a * 3 + 1]
    const uz = p[b * 3 + 2] - p[a * 3 + 2]
    const vx = p[c * 3] - p[a * 3]
    const vy = p[c * 3 + 1] - p[a * 3 + 1]
    const vz = p[c * 3 + 2] - p[a * 3 + 2]
    const cx = uy * vz - uz * vy
    const cy = uz * vx - ux * vz
    const cz = ux * vy - uy * vx
    return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz)
  }
}

/** Uniform grid over a subset of body vertices for nearest-vertex queries. */
export class VertexGrid {
  private cells = new Map<number, number[]>()
  private min = [Infinity, Infinity, Infinity]
  private max = [-Infinity, -Infinity, -Infinity]
  readonly empty: boolean
  constructor(
    private body: Body,
    indices: Iterable<number>,
    private size = 0.04
  ) {
    const p = body.positions
    let any = false
    for (const i of indices) {
      any = true
      for (let a = 0; a < 3; a++) {
        this.min[a] = Math.min(this.min[a], p[i * 3 + a])
        this.max[a] = Math.max(this.max[a], p[i * 3 + a])
      }
      const k = this.key(this.cell(p[i * 3]), this.cell(p[i * 3 + 1]), this.cell(p[i * 3 + 2]))
      const cell = this.cells.get(k)
      if (cell) cell.push(i)
      else this.cells.set(k, [i])
    }
    this.empty = !any
  }
  private cell(x: number) {
    return Math.floor(x / this.size)
  }
  private key(x: number, y: number, z: number) {
    return ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024)
  }
  /** axis-aligned bounds overlap test, expanded by `pad` */
  overlaps(other: VertexGrid, pad = 0) {
    for (let a = 0; a < 3; a++)
      if (this.min[a] - pad > other.max[a] || other.min[a] - pad > this.max[a]) return false
    return !this.empty && !other.empty
  }
  /** nearest vertex within `rings` cells, or -1 */
  nearest(x: number, y: number, z: number, rings = 3): { index: number; dist: number } {
    const s = this.size
    const reach = (rings + 1) * s
    if (
      this.empty ||
      x < this.min[0] - reach ||
      x > this.max[0] + reach ||
      y < this.min[1] - reach ||
      y > this.max[1] + reach ||
      z < this.min[2] - reach ||
      z > this.max[2] + reach
    )
      return { index: -1, dist: Infinity }
    const cx = this.cell(x)
    const cy = this.cell(y)
    const cz = this.cell(z)
    const p = this.body.positions
    let best = -1
    let bestD = Infinity
    for (let r = 0; r <= rings; r++) {
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++)
          for (let k = -r; k <= r; k++) {
            if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue
            const cell = this.cells.get(this.key(cx + i, cy + j, cz + k))
            if (!cell) continue
            for (const v of cell) {
              const dx = p[v * 3] - x
              const dy = p[v * 3 + 1] - y
              const dz = p[v * 3 + 2] - z
              const d = dx * dx + dy * dy + dz * dz
              if (d < bestD) {
                bestD = d
                best = v
              }
            }
          }
      // anything in a further ring is at least r·size away
      if (best >= 0 && Math.sqrt(bestD) <= r * s) break
    }
    return { index: best, dist: Math.sqrt(bestD) }
  }
  /**
   * Signed distance estimate to the surface: negative = inside. Uses the nearest vertex and
   * its normal, which is accurate for the smooth, closed-ish body mesh.
   */
  signed(x: number, y: number, z: number, rings = 3): { index: number; d: number } {
    const { index, dist } = this.nearest(x, y, z, rings)
    if (index < 0) return { index, d: Infinity }
    const p = this.body.positions
    const n = this.body.normals
    const dot =
      (x - p[index * 3]) * n[index * 3] +
      (y - p[index * 3 + 1]) * n[index * 3 + 1] +
      (z - p[index * 3 + 2]) * n[index * 3 + 2]
    return { index, d: dot < 0 ? dot : dist }
  }
}
