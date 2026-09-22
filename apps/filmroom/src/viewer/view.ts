import { clamp, lookup } from "~/dicom/renderer"
import type { DicomImage } from "~/dicom/loader"

export type Tool = "pan" | "window"

interface Gestures {
  tool: () => Tool
  select: () => void
  dragging: (active: boolean) => void
}

/** One projection: its display settings plus the imperative canvas renderer.
    Pixels are windowed into an offscreen raster, then drawn with pan, zoom,
    rotation and flip. `onChange` fires when anything shown in the UI changes. */
export class View {
  readonly data: DicomImage
  center: number
  width: number
  invert = false
  rotation = 0
  flip = false
  scale = 1
  fitted = true
  readonly thumbnail: string
  private panX = 0
  private panY = 0
  private dirty = true
  private pending = false
  private readonly raster: HTMLCanvasElement
  private readonly rasterCtx: CanvasRenderingContext2D
  private panel: HTMLElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private detachGestures: (() => void) | null = null

  constructor(
    data: DicomImage,
    private readonly onChange: () => void
  ) {
    this.data = data
    this.center = data.center
    this.width = data.width
    this.raster = document.createElement("canvas")
    this.raster.width = data.columns
    this.raster.height = data.rows
    this.rasterCtx = this.raster.getContext("2d")!
    this.rasterize()
    const thumb = document.createElement("canvas")
    const ratio = Math.min(100 / data.columns, 120 / data.rows)
    thumb.width = Math.max(1, Math.round(data.columns * ratio))
    thumb.height = Math.max(1, Math.round(data.rows * ratio))
    thumb.getContext("2d")!.drawImage(this.raster, 0, 0, thumb.width, thumb.height)
    this.thumbnail = thumb.toDataURL("image/png")
  }

  get isOriginal() {
    return this.near(this.data.center, this.data.width)
  }
  get isAuto() {
    return this.near(this.data.autoCenter, this.data.autoWidth)
  }
  get transformText() {
    const parts = []
    if (this.rotation) parts.push(`${this.rotation * 90}° rotation`)
    if (this.flip) parts.push("Flipped horizontally")
    return parts.join(" · ")
  }

  attach(panel: HTMLElement, canvas: HTMLCanvasElement, gestures: Gestures) {
    this.panel = panel
    this.canvas = canvas
    const observer = new ResizeObserver(() => {
      if (this.fitted) this.fit(false)
      this.requestDraw()
    })
    observer.observe(panel)
    const unbind = this.bindGestures(panel, gestures)
    this.detachGestures = () => {
      observer.disconnect()
      unbind()
    }
  }

  detach() {
    this.detachGestures?.()
    this.detachGestures = null
    this.panel = null
    this.canvas = null
  }

  /** Fit again once the viewport's next size is observed (after a layout change). */
  refitOnResize() {
    this.fitted = true
  }

  fit(draw = true) {
    const rect = this.panel?.getBoundingClientRect()
    if (!rect || rect.width < 1 || rect.height < 1) return
    const w = this.rotation % 2 ? this.data.rows : this.data.columns
    const h = this.rotation % 2 ? this.data.columns : this.data.rows
    this.scale = Math.min(Math.max(20, rect.width - 46) / w, Math.max(20, rect.height - 84) / h)
    this.panX = 0
    this.panY = 0
    this.fitted = true
    if (draw) this.requestDraw()
    this.onChange()
  }

  zoom(factor: number, x?: number, y?: number) {
    const old = this.scale
    this.scale = clamp(old * factor, 0.025, 8)
    const ratio = this.scale / old
    const cx = (this.panel?.clientWidth ?? 0) / 2,
      cy = (this.panel?.clientHeight ?? 0) / 2
    x = x ?? cx
    y = y ?? cy
    this.panX = x - cx - (x - cx - this.panX) * ratio
    this.panY = y - cy - (y - cy - this.panY) * ratio
    this.fitted = false
    this.requestDraw()
    this.onChange()
  }

  setWindow(center: number, width: number) {
    this.center = clamp(center, this.data.centerMin, this.data.centerMax)
    this.width = clamp(width, 1, this.data.widthMax)
    this.dirty = true
    this.requestDraw()
    this.onChange()
  }

  toggleInvert() {
    this.invert = !this.invert
    this.dirty = true
    this.requestDraw()
    this.onChange()
  }

  toggleFlip() {
    this.flip = !this.flip
    this.requestDraw()
    this.onChange()
  }

  rotate() {
    this.rotation = (this.rotation + 1) % 4
    this.fit()
  }

  reset() {
    this.center = this.data.center
    this.width = this.data.width
    this.invert = false
    this.rotation = 0
    this.flip = false
    this.dirty = true
    this.fit()
    this.onChange()
  }

  /** Full-resolution PNG with the current window, inversion, rotation and flip. */
  exportPng(): Promise<{ blob: Blob | null; width: number; height: number }> {
    this.rasterize()
    const output = document.createElement("canvas")
    output.width = this.rotation % 2 ? this.data.rows : this.data.columns
    output.height = this.rotation % 2 ? this.data.columns : this.data.rows
    const ctx = output.getContext("2d")!
    ctx.translate(output.width / 2, output.height / 2)
    ctx.scale(this.flip ? -1 : 1, 1)
    ctx.rotate((this.rotation * Math.PI) / 2)
    ctx.drawImage(this.raster, -this.data.columns / 2, -this.data.rows / 2)
    return new Promise((resolve) =>
      output.toBlob(
        (blob) => resolve({ blob, width: output.width, height: output.height }),
        "image/png"
      )
    )
  }

  private near(center: number, width: number) {
    return Math.abs(this.center - center) < 1 && Math.abs(this.width - width) < 1
  }

  private rasterize() {
    if (!this.dirty) return
    const table = lookup(
      this.center,
      this.width,
      this.invert !== this.data.baseInvert,
      this.data.slope,
      this.data.intercept
    )
    const image = this.rasterCtx.createImageData(this.data.columns, this.data.rows)
    const pixels = this.data.pixels
    for (let n = 0, offset = 0; n < pixels.length; n++, offset += 4) {
      const g = table[pixels[n]]
      image.data[offset] = g
      image.data[offset + 1] = g
      image.data[offset + 2] = g
      image.data[offset + 3] = 255
    }
    this.rasterCtx.putImageData(image, 0, 0)
    this.dirty = false
  }

  private requestDraw() {
    if (this.pending) return
    this.pending = true
    requestAnimationFrame(() => {
      this.pending = false
      this.draw()
    })
  }

  private draw() {
    const { panel, canvas } = this
    if (!panel || !canvas) return
    const w = panel.clientWidth,
      h = panel.clientHeight
    if (w <= 0 || h <= 0) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    this.rasterize()
    const ctx = canvas.getContext("2d")!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = "#151517"
    ctx.fillRect(0, 0, w, h)
    ctx.translate(w / 2 + this.panX, h / 2 + this.panY)
    ctx.scale(this.scale * (this.flip ? -1 : 1), this.scale)
    ctx.rotate((this.rotation * Math.PI) / 2)
    ctx.imageSmoothingEnabled = this.scale < 2
    ctx.drawImage(this.raster, -this.data.columns / 2, -this.data.rows / 2)
  }

  private bindGestures(panel: HTMLElement, gestures: Gestures) {
    const pointers = new Map<number, { x: number; y: number }>()
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      gestures.select()
      panel.focus({ preventScroll: true })
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      panel.setPointerCapture(event.pointerId)
      gestures.dragging(true)
    }
    const move = (event: PointerEvent) => {
      const old = pointers.get(event.pointerId)
      if (!old) return
      if (pointers.size === 2) {
        const before = [...pointers.values()]
        const oldDistance = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y)
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        const after = [...pointers.values()]
        const distance = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y)
        const r = panel.getBoundingClientRect()
        if (oldDistance > 0)
          this.zoom(
            distance / oldDistance,
            (after[0].x + after[1].x) / 2 - r.left,
            (after[0].y + after[1].y) / 2 - r.top
          )
        return
      }
      const dx = event.clientX - old.x,
        dy = event.clientY - old.y
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (gestures.tool() === "window")
        this.setWindow(
          this.center + (dy * (this.data.centerMax - this.data.centerMin)) / 800,
          this.width + (dx * this.data.widthMax) / 800
        )
      else {
        this.panX += dx
        this.panY += dy
        this.fitted = false
        this.requestDraw()
      }
    }
    const end = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (!pointers.size) gestures.dragging(false)
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      gestures.select()
      const rect = panel.getBoundingClientRect()
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? panel.clientHeight : 1)
      this.zoom(
        Math.exp(-clamp(delta, -300, 300) * 0.002),
        event.clientX - rect.left,
        event.clientY - rect.top
      )
    }
    const dblclick = () => this.fit()
    panel.addEventListener("pointerdown", down)
    panel.addEventListener("pointermove", move)
    panel.addEventListener("pointerup", end)
    panel.addEventListener("pointercancel", end)
    panel.addEventListener("lostpointercapture", end)
    panel.addEventListener("wheel", wheel, { passive: false })
    panel.addEventListener("dblclick", dblclick)
    return () => {
      panel.removeEventListener("pointerdown", down)
      panel.removeEventListener("pointermove", move)
      panel.removeEventListener("pointerup", end)
      panel.removeEventListener("pointercancel", end)
      panel.removeEventListener("lostpointercapture", end)
      panel.removeEventListener("wheel", wheel)
      panel.removeEventListener("dblclick", dblclick)
    }
  }
}
