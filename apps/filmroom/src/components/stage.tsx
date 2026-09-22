import { Button } from "@base-ui/react/button"
import { Image } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { Filmroom } from "~/viewer/use-filmroom"
import type { Tool, View } from "~/viewer/view"
import { cx } from "./controls"

export function Stage({ app }: { app: Filmroom }) {
  return (
    <main className="order-1 flex h-[60dvh] min-h-90 min-w-0 flex-col bg-canvas sm:order-none sm:col-start-2 sm:row-start-1 sm:h-auto sm:min-h-0">
      <div
        aria-label="X-ray image area"
        className={cx(
          "relative grid min-h-0 flex-1 gap-px overflow-hidden bg-[#3b3b3e]",
          app.compare && app.ready ? "grid-cols-2 grid-rows-2" : "grid-cols-1 grid-rows-1"
        )}
      >
        {app.ready ? (
          app.visible.map(({ view, index }) => (
            <Viewport
              key={index}
              view={view}
              index={index}
              selected={index === app.active}
              compare={app.compare}
              tool={app.tool}
              onSelect={() => app.select(index)}
            />
          ))
        ) : (
          <LoadState app={app} />
        )}
      </div>
    </main>
  )
}

function LoadState({ app }: { app: Filmroom }) {
  const failed = app.load.status === "error"
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center bg-canvas p-6 text-center text-[#ececf1]"
    >
      <Image size={54} strokeWidth={1} className="mb-3 text-[#8c8c99]" />
      <h2 className="my-2 text-[23px] font-[550] tracking-[-0.5px]">
        {failed ? "Couldn’t open the study" : "Opening your study"}
      </h2>
      <p className="text-[13px] leading-[1.8] text-[#92929d]">
        {"message" in app.load ? app.load.message : ""}
      </p>
      {failed && (
        <Button
          onClick={app.open}
          className="mt-4 rounded-md border-[0.5px] border-[#0071e5] bg-[linear-gradient(#188aff,#0078f5)] px-4 py-1.75 text-xs font-medium text-white"
        >
          Try again
        </Button>
      )}
    </div>
  )
}

function Viewport({
  view,
  index,
  selected,
  compare,
  tool,
  onSelect
}: {
  view: View
  index: number
  selected: boolean
  compare: boolean
  tool: Tool
  onSelect: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const latest = useRef({ tool, onSelect })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    latest.current = { tool, onSelect }
  })

  useEffect(() => {
    view.attach(panel.current!, canvas.current!, {
      tool: () => latest.current.tool,
      select: () => latest.current.onSelect(),
      dragging: setDragging
    })
    return () => view.detach()
  }, [view])

  const overlay = "pointer-events-none absolute [text-shadow:0_1px_3px_#000]"
  return (
    <div
      ref={panel}
      tabIndex={0}
      aria-label={`${view.data.name} projection`}
      onFocus={onSelect}
      className={cx(
        "relative min-h-0 min-w-0 touch-none overflow-hidden bg-canvas",
        dragging ? "cursor-grabbing" : tool === "window" ? "cursor-crosshair" : "cursor-grab",
        compare &&
          selected &&
          "after:pointer-events-none after:absolute after:inset-0 after:z-1 after:shadow-[inset_0_0_0_2px_#0a84ff]"
      )}
    >
      <canvas
        ref={canvas}
        role="img"
        aria-label={`${view.data.description}, DICOM image`}
        className="absolute inset-0 block size-full"
      />
      <div
        className={cx(
          overlay,
          "top-3 left-3 flex items-center gap-1.75 text-[11px] text-[#d0d0d6] [text-shadow:0_1px_4px_#000] sm:top-4.5 sm:left-5 sm:text-xs"
        )}
      >
        <small className="text-[10px] text-[#7e7e86] tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </small>
        <span>{view.data.name}</span>
      </div>
      {view.data.laterality && (
        <span className="pointer-events-none absolute top-3 right-3 rounded border border-white/10 bg-white/5 px-1.25 py-0.5 text-[10px] text-[#bbbcc4] sm:top-4 sm:right-5">
          {view.data.laterality}
        </span>
      )}
      <span
        className={cx(
          overlay,
          "bottom-3 left-3 font-mono text-[9px] whitespace-pre text-[#94949e] sm:bottom-4 sm:left-5 sm:text-[10px]",
          compare && "max-sm:hidden md:text-[10px] sm:text-[8px]"
        )}
      >
        {`W ${Math.round(view.width)}  L ${Math.round(view.center)}  ·  ${Math.round(view.scale * 100)}%`}
      </span>
      <span
        className={cx(
          overlay,
          "right-3 bottom-3 text-[8px] text-[#d4c392] sm:right-4.5 sm:bottom-4 sm:text-[10px]",
          compare && "max-sm:right-auto max-sm:left-3"
        )}
      >
        {view.transformText}
      </span>
    </div>
  )
}
