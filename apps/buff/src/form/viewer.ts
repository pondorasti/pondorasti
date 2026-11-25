/* ==========================================================================
   FormViewer: one WebGL canvas, two scenes (good | bad) rendered into the
   two halves with a shared camera, so orbiting one orbits both. Browser-only
   — import it dynamically from an effect.
   ========================================================================== */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Quaternion,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type SkinnedMesh
} from "three"
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js"
import { Rig } from "./rig"
import { buildTrack, sample, type Track } from "./pose"
import type { Anchor, Movement, Prop, Vec3 } from "./types"

export const MODEL_URL = "/models/body.glb"

let modelPromise: Promise<GLTF> | null = null
const loadModel = () => (modelPromise ??= new GLTFLoader().loadAsync(MODEL_URL))

export type ViewName = "preset" | "front" | "side" | "back"
export type Layout = "row" | "column"

const CALM = new Color("#34d399")
const HOT = new Color("#ff3b30")
const UP = new Vector3(0, 1, 0)

interface DynamicProp {
  mesh: Object3D
  from: Anchor
  to: Anchor
  overhang: number
}

interface Stage {
  scene: Scene
  rig: Rig
  track: Track | null
  props: Group
  dynamic: DynamicProp[]
  hl: {
    pos: { value: Vector3 }
    color: { value: Color }
    radius: { value: number }
    strength: { value: number }
  }
  label: HTMLDivElement
  labelPos: Vector3
  stress: number
}

export interface ViewerCallbacks {
  /** called every frame with the loop phase 0–1 */
  onPhase?: (phase: number) => void
}

export class FormViewer {
  private renderer: WebGLRenderer
  private camera = new PerspectiveCamera(32, 1, 0.05, 50)
  private controls: OrbitControls
  private stages: Stage[] = []
  private movement: Movement | null = null
  private raf = 0
  private last = 0
  private time = 0
  private resizeObserver: ResizeObserver
  private layout: Layout = "row"
  private disposed = false
  private geometries = {
    cyl: new CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0),
    box: new BoxGeometry(1, 1, 1),
    pulley: new TorusGeometry(0.06, 0.018, 10, 24)
  }
  private materials: Material[] = []

  playing = true
  speed = 1

  private constructor(
    private container: HTMLElement,
    private callbacks: ViewerCallbacks
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setClearColor(0x000000, 0)
    const canvas = this.renderer.domElement
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none"
    container.appendChild(canvas)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 1.2
    this.controls.maxDistance = 9
    this.controls.maxPolarAngle = Math.PI * 0.52

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
  }

  static async create(container: HTMLElement, callbacks: ViewerCallbacks = {}) {
    const viewer = new FormViewer(container, callbacks)
    const gltf = await loadModel()
    if (viewer.disposed) return viewer
    for (let i = 0; i < 2; i++) viewer.stages.push(viewer.makeStage(gltf, i))
    viewer.resize()
    viewer.last = performance.now()
    viewer.raf = requestAnimationFrame(viewer.frame)
    return viewer
  }

  private makeStage(gltf: GLTF, index: number): Stage {
    const scene = new Scene()
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches

    scene.add(new HemisphereLight(0xf2f5ff, dark ? 0x30343c : 0xb9b2a8, dark ? 1.35 : 1.55))
    const key = new DirectionalLight(0xffffff, 2.2)
    key.position.set(-2.2, 4, 3)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = key.shadow.camera.bottom = -2
    key.shadow.camera.right = key.shadow.camera.top = 2
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 10
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.02
    scene.add(key)
    const rim = new DirectionalLight(0xcfe3ff, 1.1)
    rim.position.set(2.5, 2.5, -3)
    scene.add(rim)

    // shadow catcher + a faint disc so the body has something to stand on
    const disc = new Mesh(
      new CircleGeometry(1.5, 64),
      this.track(
        new MeshBasicMaterial({
          color: dark ? 0xffffff : 0x000000,
          transparent: true,
          opacity: dark ? 0.035 : 0.04
        })
      )
    )
    disc.rotation.x = -Math.PI / 2
    scene.add(disc)
    const floor = new Mesh(
      new CircleGeometry(3, 64),
      this.track(new ShadowMaterial({ opacity: dark ? 0.45 : 0.18 }))
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.001
    floor.receiveShadow = true
    scene.add(floor)

    const model = cloneSkinned(gltf.scene)
    const hl = {
      pos: { value: new Vector3() },
      color: { value: CALM.clone() },
      radius: { value: 0.07 },
      strength: { value: 0 }
    }
    model.traverse((o) => {
      const mesh = o as SkinnedMesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      const name = (mesh.material as Material).name
      if (name.startsWith("MI_Hair")) {
        // the pack's hair textures are greyscale, tinted by a custom shader in-engine
        const hair = this.track((mesh.material as MeshStandardMaterial).clone())
        hair.color.set(0x4a3326)
        mesh.material = hair
      }
      if (name === "MI_Superhero_Male") {
        mesh.material = this.track(withHighlight(mesh.material as MeshStandardMaterial, hl))
      }
    })
    scene.add(model)
    const rig = new Rig(model)

    const props = new Group()
    scene.add(props)

    const label = document.createElement("div")
    label.className = "form-hl-label"
    label.dataset.stage = String(index)
    this.container.appendChild(label)

    return {
      scene,
      rig,
      track: null,
      props,
      dynamic: [],
      hl,
      label,
      labelPos: new Vector3(),
      stress: 0
    }
  }

  private track<T extends Material>(m: T): T {
    this.materials.push(m)
    return m
  }

  setMovement(m: Movement) {
    const changed = this.movement?.id !== m.id
    this.movement = m
    const variants = [m.good, m.bad]
    this.stages.forEach((s, i) => {
      s.track = buildTrack(m, variants[i])
      this.buildProps(s, m.props ?? [])
      s.hl.radius.value = m.highlight?.radius ?? 0.07
      s.label.replaceChildren(
        Object.assign(document.createElement("span"), { textContent: m.highlight?.label ?? "" })
      )
      s.label.style.display = m.highlight ? "" : "none"
    })
    if (changed) {
      this.time = 0
      this.setView("preset")
    }
  }

  private buildProps(stage: Stage, props: Prop[]) {
    stage.props.clear()
    stage.dynamic = []
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const mat = (color: string | undefined, fallback: number, rough = 0.6, metal = 0.1) =>
      this.track(
        new MeshStandardMaterial({ color: color ?? fallback, roughness: rough, metalness: metal })
      )
    for (const p of props) {
      if (p.type === "box") {
        const mesh = new Mesh(this.geometries.box, mat(p.color, dark ? 0x3a3f48 : 0x5b6270, 0.8, 0))
        mesh.position.set(...p.position)
        mesh.scale.set(...p.size)
        if (p.rotation)
          mesh.rotation.set(
            ...(p.rotation.map((d) => (d * Math.PI) / 180) as [number, number, number])
          )
        mesh.castShadow = mesh.receiveShadow = true
        stage.props.add(mesh)
      } else if (p.type === "pulley") {
        const mesh = new Mesh(this.geometries.pulley, mat(undefined, 0x9aa1ab, 0.35, 0.7))
        mesh.position.set(...p.position)
        mesh.rotation.y = Math.PI / 2
        mesh.castShadow = true
        stage.props.add(mesh)
      } else {
        const radius =
          p.type === "band" ? 0.011 : p.type === "bar" ? (p.radius ?? 0.014) : (p.radius ?? 0.005)
        const color =
          p.type === "band" ? (p.color ?? "#f59e0b") : p.type === "bar" ? p.color : p.color
        const mesh = new Mesh(
          this.geometries.cyl,
          p.type === "band"
            ? mat(color, 0xf59e0b, 0.55, 0)
            : p.type === "bar"
              ? mat(color, 0xb8bec7, 0.3, 0.85)
              : mat(color, 0x2b2f36, 0.5, 0.3)
        )
        mesh.userData.radius = radius
        mesh.castShadow = true
        stage.props.add(mesh)
        stage.dynamic.push({
          mesh,
          from: p.from,
          to: p.to,
          overhang: p.type === "bar" ? (p.overhang ?? 0.2) : 0
        })
      }
    }
  }

  setView(view: ViewName) {
    const m = this.movement
    if (!m) return
    const target = new Vector3(...m.camera.target)
    const preset = new Vector3(...m.camera.position)
    const dist = preset.distanceTo(target)
    const h = preset.y - target.y
    const flat = Math.sqrt(Math.max(dist * dist - h * h, 0.01))
    const pos =
      view === "preset"
        ? preset
        : view === "front"
          ? new Vector3(0, preset.y, flat).add(new Vector3(target.x, 0, target.z))
          : view === "back"
            ? new Vector3(0, preset.y, -flat).add(new Vector3(target.x, 0, target.z))
            : new Vector3(-flat, preset.y, 0).add(new Vector3(0, 0, target.z)) // right side
    this.camera.position.copy(pos)
    this.controls.target.copy(target)
    this.controls.update()
  }

  setLayout(layout: Layout) {
    this.layout = layout
    this.resize()
  }

  /** jump to a phase 0–1 */
  seek(phase: number) {
    if (!this.movement) return
    this.time = phase * this.movement.duration
  }

  get phase() {
    return this.movement ? (this.time / this.movement.duration) % 1 : 0
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
  }

  private frame = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min((now - this.last) / 1000, 0.1)
    this.last = now
    if (this.playing) this.time += dt * this.speed
    this.controls.update()
    const m = this.movement
    if (!m) return
    const phase = (this.time / m.duration) % 1
    this.callbacks.onPhase?.(phase)

    const { clientWidth: w, clientHeight: h } = this.container
    const pulse = 0.82 + 0.18 * Math.sin(now / 260)
    const tmpA = new Vector3()
    const tmpB = new Vector3()
    const q = new Quaternion()

    for (const s of this.stages) {
      if (!s.track) continue
      const c = sample(s.track, phase)
      // a little life: slow breathing, independent of the movement loop
      const breath = Math.sin(this.time * ((Math.PI * 2) / 4.2))
      c["spine.flex"] = (c["spine.flex"] ?? 0) - breath * 0.8
      c["scapulaL.elev"] = (c["scapulaL.elev"] ?? 0) + breath * 0.8
      c["scapulaR.elev"] = (c["scapulaR.elev"] ?? 0) + breath * 0.8
      c["head.flex"] = (c["head.flex"] ?? 0) + breath * 0.5
      s.rig.apply(c)

      // props that follow the body
      for (const d of s.dynamic) {
        s.rig.anchor(d.from, tmpA)
        s.rig.anchor(d.to, tmpB)
        const dir = tmpB.clone().sub(tmpA)
        let len = dir.length()
        if (len < 1e-4) continue
        dir.divideScalar(len)
        if (d.overhang) {
          tmpA.addScaledVector(dir, -d.overhang)
          len += d.overhang * 2
        }
        const r = d.mesh.userData.radius as number
        d.mesh.position.copy(tmpA)
        d.mesh.quaternion.copy(q.setFromUnitVectors(UP, dir))
        d.mesh.scale.set(r, len, r)
      }

      // highlight
      if (m.highlight) {
        const { bone, offset } = m.highlight
        s.rig.anchor({ bone, offset }, s.hl.pos.value)
        s.stress = c.stress ?? 0
        s.hl.color.value.copy(CALM).lerp(HOT, Math.min(Math.max(s.stress, 0), 1))
        s.hl.strength.value = (0.55 + 0.45 * s.stress) * pulse
      } else s.hl.strength.value = 0
    }

    // render each half
    const r = this.renderer
    r.setScissorTest(true)
    const col = this.layout === "column"
    const vw = col ? w : w / 2
    const vh = col ? h / 2 : h
    this.camera.aspect = vw / vh
    this.camera.updateProjectionMatrix()
    this.stages.forEach((s, i) => {
      const x = col ? 0 : i * vw
      const yTop = col ? i * vh : 0
      const yGl = h - yTop - vh
      r.setViewport(x, yGl, vw, vh)
      r.setScissor(x, yGl, vw, vh)
      r.render(s.scene, this.camera)

      // label next to the highlight
      if (m.highlight) {
        const p = s.labelPos.copy(s.hl.pos.value).project(this.camera)
        const visible = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05
        s.label.style.opacity = visible ? "1" : "0"
        s.label.style.transform = `translate(${x + ((p.x + 1) / 2) * vw}px, ${yTop + ((1 - p.y) / 2) * vh}px)`
        s.label.dataset.stress = s.stress > 0.5 ? "hot" : "calm"
      }
    })
    r.setScissorTest(false)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    for (const s of this.stages) s.label.remove()
    for (const g of Object.values(this.geometries)) g.dispose()
    for (const m of this.materials) m.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}

/** Clone a material and add a soft glow around a world-space point (works with skinning). */
function withHighlight(src: MeshStandardMaterial, hl: Stage["hl"]) {
  const mat = src.clone()
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHlPos = hl.pos
    shader.uniforms.uHlColor = hl.color
    shader.uniforms.uHlRadius = hl.radius
    shader.uniforms.uHlStrength = hl.strength
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vHlWorld;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvHlWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vHlWorld;
uniform vec3 uHlPos;
uniform vec3 uHlColor;
uniform float uHlRadius;
uniform float uHlStrength;`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float hlD = distance(vHlWorld, uHlPos);
float hl = uHlStrength * (1.0 - smoothstep(uHlRadius * 0.3, uHlRadius, hlD));
diffuseColor.rgb = mix(diffuseColor.rgb, uHlColor, hl * 0.6);
totalEmissiveRadiance += uHlColor * hl * 0.55;`
      )
  }
  mat.customProgramCacheKey = () => "form-highlight"
  return mat
}

export type { Vec3 }
