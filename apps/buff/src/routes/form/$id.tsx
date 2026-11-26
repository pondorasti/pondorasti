import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { Check, X } from "lucide-react"
import { getMovement } from "~/form/catalog"
import { getExercise } from "~/data"
import { BlockTitle } from "~/components/screen-header"
import { FormViewer } from "~/components/form-viewer"

export const Route = createFileRoute("/form/$id")({
  /** ?at=0.5 opens the demo paused at that point of the loop (0–1), e.g. to share one frame */
  validateSearch: (search: Record<string, unknown>): { at?: number } => {
    const at = Number(search.at)
    return search.at !== undefined && Number.isFinite(at)
      ? { at: Math.min(Math.max(at, 0), 1) }
      : {}
  },
  loader: ({ params }) => {
    const movement = getMovement(params.id)
    if (!movement) throw notFound()
    return { movement }
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.movement.title} — buff form` }] : []
  }),
  component: FormPage
})

function FormPage() {
  const { movement: m } = Route.useLoaderData()
  const { at } = Route.useSearch()
  const exercise = m.exercise ? getExercise(m.exercise) : undefined

  return (
    <div className="px-4 pt-4 pb-10 md:px-[26px] md:pt-[22px]">
      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-dim">{m.group}</div>
        <h1 className="text-xl font-extrabold tracking-[-0.02em]">{m.title}</h1>
        <p className="mt-0.5 text-[14.5px] text-muted">{m.cue}</p>
      </div>

      <FormViewer movement={m} at={at} />
      <p className="mt-2 text-[12px] text-dim">
        Drag to orbit · scroll or pinch to zoom · right-drag to pan · space to pause
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-card border border-emerald-500/25 bg-panel p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" strokeWidth={3} /> Do · {m.good.label}
          </div>
          <p className="text-[13.5px] text-muted">{m.good.description}</p>
        </div>
        <div className="rounded-card border border-red/25 bg-panel p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-red">
            <X className="h-4 w-4" strokeWidth={3} /> Avoid · {m.bad.label}
          </div>
          <p className="text-[13.5px] text-muted">{m.bad.description}</p>
        </div>
      </div>

      {m.notes && m.notes.length > 0 && (
        <>
          <BlockTitle>Cues</BlockTitle>
          <ul className="flex max-w-[760px] flex-col gap-2">
            {m.notes.map((n) => (
              <li key={n} className="flex gap-2.5 text-[14px] text-muted">
                <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                {n}
              </li>
            ))}
          </ul>
        </>
      )}

      {exercise && (
        <Link
          to="/exercise/$id"
          params={{ id: exercise.id }}
          className="mt-6 inline-block text-[13.5px] font-semibold text-accent-2 hover:underline"
        >
          {exercise.name} in your routine →
        </Link>
      )}
    </div>
  )
}
