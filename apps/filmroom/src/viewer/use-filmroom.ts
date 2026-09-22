import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Toast } from "@base-ui/react/toast"
import { bundledStudy } from "~/dicom/study"
import type { StudyMessage } from "~/dicom/study.worker"
import { View, type Tool } from "./view"

export type LoadState =
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "ready" }

const LOADING: LoadState = { status: "loading", message: "Loading four original projections…" }

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("")
}

/** All viewer state. Views own their canvas state and report changes through
    `rerender`; everything else is plain React state. */
export function useFilmroom() {
  const toast = Toast.useToastManager()
  const [load, setLoad] = useState<LoadState>(LOADING)
  const [views, setViews] = useState<View[]>([])
  const [active, setActive] = useState(0)
  const [tool, setTool] = useState<Tool>("pan")
  const [compare, setCompare] = useState(false)
  const [sidebar, setSidebar] = useState(true)
  const [inspector, setInspector] = useState(true)
  const [help, setHelp] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const worker = useRef<Worker | null>(null)

  const notify = useCallback(
    (message: string) => toast.add({ description: message, timeout: 2800 }),
    [toast]
  )

  const open = useCallback(() => {
    if (worker.current) return
    setLoad(LOADING)
    const next = new Worker(new URL("../dicom/study.worker.ts", import.meta.url), {
      type: "module"
    })
    worker.current = next
    const finish = () => {
      next.terminate()
      worker.current = null
    }
    next.onmessage = ({ data }: MessageEvent<StudyMessage>) => {
      if (data.type === "progress") setLoad({ status: "loading", message: data.message })
      else if (data.type === "error") {
        finish()
        setLoad({ status: "error", message: data.message })
      } else {
        finish()
        setViews(data.study.images.map((image) => new View(image, rerender)))
        setLoad({ status: "ready" })
      }
    }
    next.onerror = () => {
      finish()
      setLoad({
        status: "error",
        message: "The image decoder could not start. Please try again."
      })
    }
    next.postMessage({ baseUrl: new URL("/", location.href).href })
  }, [])

  useEffect(() => {
    open()
    return () => {
      worker.current?.terminate()
      worker.current = null
    }
  }, [open])

  const view = views[active] as View | undefined
  const ready = load.status === "ready" && !!view

  const select = useCallback(
    (index: number) => {
      if (views.length) setActive(((index % views.length) + views.length) % views.length)
    },
    [views.length]
  )

  const setLayout = useCallback(
    (next: boolean) => {
      for (const each of views) each.refitOnResize()
      setCompare(next)
    },
    [views]
  )

  const reset = useCallback(() => {
    view?.reset()
    notify("Selected image reset")
  }, [view, notify])

  const exportPng = useCallback(async () => {
    if (!view) return
    const { blob, width, height } = await view.exportPng()
    if (!blob) return notify("Export failed. Try again.")
    download(blob, `right-shoulder-${view.data.name.toLowerCase().replaceAll(" ", "-")}.png`)
    notify(`PNG exported · ${width} × ${height}`)
  }, [view, notify])

  const exportDicom = useCallback(async () => {
    setExporting(true)
    notify("Preparing original DICOM archive…")
    try {
      const response = await fetch(new URL(bundledStudy.archive.file, new URL("/", location.href)))
      if (!response.ok) throw new Error("Archive unavailable")
      const bytes = await response.arrayBuffer()
      if ((await sha256(bytes)) !== bundledStudy.archive.sha256)
        throw new Error("Archive checksum mismatch")
      download(new Blob([bytes], { type: "application/zip" }), bundledStudy.archive.name)
      notify("Original DICOM archive exported")
    } catch {
      notify("The original archive could not be downloaded. Please try again.")
    } finally {
      setExporting(false)
    }
  }, [notify])

  useEffect(() => {
    if (!view || help) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target.matches("input,textarea,select,[role=slider]")
      )
        return
      const key = event.key.toLowerCase()
      const actions: Record<string, () => void> = {
        v: () => setTool("pan"),
        w: () => setTool("window"),
        f: () => view.fit(),
        r: reset,
        i: () => view.toggleInvert(),
        c: () => setLayout(!compare),
        "+": () => view.zoom(1.25),
        "=": () => view.zoom(1.25),
        "-": () => view.zoom(0.8),
        arrowright: () => select(active + 1),
        arrowleft: () => select(active - 1)
      }
      if (/^[1-9]$/.test(key) && Number(key) <= views.length)
        actions[key] = () => select(Number(key) - 1)
      if (actions[key]) {
        event.preventDefault()
        actions[key]()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [view, views.length, active, compare, help, reset, select, setLayout])

  // Comparison shows the page of four projections containing the selection.
  const page = Math.floor(active / 4)
  const visible = compare
    ? views.map((each, index) => ({ view: each, index })).slice(page * 4, page * 4 + 4)
    : view
      ? [{ view, index: active }]
      : []

  return {
    load,
    open,
    ready,
    views,
    view,
    visible,
    active,
    select,
    tool,
    setTool,
    compare,
    setLayout,
    sidebar,
    setSidebar,
    inspector,
    setInspector,
    help,
    setHelp,
    reset,
    exportPng,
    exportDicom,
    exporting
  }
}

export type Filmroom = ReturnType<typeof useFilmroom>
