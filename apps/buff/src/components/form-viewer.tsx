import { useEffect, useRef, useState } from "react"
import { Check, Pause, Play, RotateCcw, X } from "lucide-react"
import type { FormViewer as Viewer, ViewName } from "~/form/viewer"
import type { Movement } from "~/form/types"

const SPEEDS = [
  { value: 1, label: "1×" },
  { value: 0.5, label: "½×" },
  { value: 0.25, label: "¼×" }
]
const VIEWS: { value: ViewName; label: string }[] = [
  { value: "preset", label: "Best angle" },
  { value: "front", label: "Front" },
  { value: "side", label: "Right side" },
  { value: "back", label: "Back" }
]

/** Two rigged bodies (good | bad) playing the same movement in sync. */
export function FormViewer({ movement, at }: { movement: Movement; at?: number }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const scrubRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speed, setSpeed] = useState(1)
  const [column, setColumn] = useState(false)

  // Playing + camera choice reset whenever the demo (or ?at=) changes, without effects:
  // state remembers which demo it belongs to and falls back to the default otherwise.
  const key = `${movement.id}@${at ?? ""}`
  const [play, setPlay] = useState({ key, on: at === undefined })
  const playing = play.key === key ? play.on : at === undefined
  const setPlaying = (on: boolean) => setPlay({ key, on })
  const [camera, setCamera] = useState({ id: movement.id, view: "preset" as ViewName })
  const view = camera.id === movement.id ? camera.view : "preset"

  // create once; the model is cached so navigating between demos reuses the canvas
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    let viewer: Viewer | null = null
    let cancelled = false
    import("~/form/viewer")
      .then(({ FormViewer }) =>
        FormViewer.create(box, {
          onPhase: (p) => {
            if (scrubRef.current) scrubRef.current.value = String(Math.round(p * 1000))
          }
        })
      )
      .then((v) => {
        if (cancelled) return v.dispose()
        viewer = v
        viewerRef.current = v
        setReady(true)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
      viewer?.dispose()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const v = viewerRef.current
    if (!v) return
    v.setMovement(movement)
    if (at !== undefined) v.seek(at)
  }, [movement, at, ready])
  useEffect(() => {
    if (viewerRef.current) viewerRef.current.playing = playing
  }, [playing, ready])
  useEffect(() => {
    if (viewerRef.current) viewerRef.current.speed = speed
  }, [speed, ready])

  // stack the two bodies on narrow screens
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(() => setColumn(box.clientWidth < 560))
    ro.observe(box)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    viewerRef.current?.setLayout(column ? "column" : "row")
  }, [column, ready])

  // space = play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key !== " " || t.closest("input, textarea, button, select, a")) return
      e.preventDefault()
      setPlay({ key, on: !playing })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [key, playing])

  const pick = (v: ViewName) => {
    setCamera({ id: movement.id, view: v })
    viewerRef.current?.setView(v)
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-panel">
      <div
        ref={boxRef}
        className={
          "form-stage relative w-full select-none " +
          (column
            ? "h-[min(1040px,calc(100dvh-170px))] min-h-[640px]"
            : "h-[min(620px,calc(100dvh-230px))] min-h-[420px]")
        }
      >
        {/* divider + labels */}
        <div
          className={
            "pointer-events-none absolute bg-line " +
            (column ? "inset-x-0 top-1/2 h-px" : "inset-y-0 left-1/2 w-px")
          }
        />
        <VariantTag
          good
          className={
            "left-3 top-3 " + (column ? "max-w-[calc(100%-24px)]" : "max-w-[calc(50%-24px)]")
          }
          text={movement.good.label}
        />
        <VariantTag
          className={
            column
              ? "left-3 top-[calc(50%+12px)] max-w-[calc(100%-24px)]"
              : "left-[calc(50%+12px)] top-3 max-w-[calc(50%-24px)]"
          }
          text={movement.bad.label}
        />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-sm text-dim">
            Loading body…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-red">
            Couldn't start the 3D viewer: {error}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-3 py-2.5">
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-fg"
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause (space)" : "Play (space)"}
        >
          {playing ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
          )}
        </button>
        <input
          ref={scrubRef}
          type="range"
          min={0}
          max={1000}
          defaultValue={0}
          aria-label="Position in the movement"
          className="min-w-[120px] flex-1 accent-[var(--accent)]"
          onInput={(e) => {
            setPlaying(false)
            viewerRef.current?.seek(Number(e.currentTarget.value) / 1000)
          }}
        />
        <Segmented label="Speed" options={SPEEDS} value={speed} onChange={setSpeed} />
        <div className="flex items-center gap-1.5">
          <Segmented label="Camera" options={VIEWS} value={view} onChange={pick} />
          <button
            type="button"
            onClick={() => pick("preset")}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-txt"
            aria-label="Reset camera"
            title="Reset camera"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function VariantTag({
  good,
  text,
  className
}: {
  good?: boolean
  text: string
  className: string
}) {
  const Icon = good ? Check : X
  return (
    <div
      className={
        "pointer-events-none absolute z-10 flex items-center gap-1.5 rounded-full border bg-panel px-2.5 py-1 text-[12px] font-bold shadow-sm " +
        (good
          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
          : "border-red/40 text-red") +
        " " +
        className
      }
    >
      <Icon className="h-3.5 w-3.5 flex-none" strokeWidth={3} />
      <span className="truncate">
        {good ? "Do" : "Avoid"} · {text}
      </span>
    </div>
  )
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[10px] bg-panel-2 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={
            "rounded-[8px] px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap " +
            (o.value === value ? "bg-panel text-txt shadow-sm" : "text-muted hover:text-txt")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
