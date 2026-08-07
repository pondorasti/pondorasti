import { createFileRoute, notFound } from '@tanstack/react-router'
import { getDayBySlug } from '~/data'
import { ScreenHeader, Pad } from '~/components/ScreenHeader'
import { ExerciseTable } from '~/components/ExerciseTable'
import { WeekChips } from '~/components/WeekChips'

export const Route = createFileRoute('/routine/$day')({
  loader: ({ params }) => {
    const day = getDayBySlug(params.day)
    if (!day) throw notFound()
    return { day }
  },
  component: RoutineDay,
})

function RoutineDay() {
  const { day } = Route.useLoaderData()
  return (
    <>
      <ScreenHeader title="Routine" />
      <Pad>
        <div className="mb-4">
          <WeekChips activeSlug={day.slug} showFocus />
        </div>

        <div className="mx-0.5 mb-3 flex gap-3.5 text-[12.5px] text-muted">
          <span>
            ~<b className="text-txt">{day.sets} sets</b>
          </span>
          <span>
            ~<b className="text-txt">{day.time}</b>
          </span>
        </div>

        <ExerciseTable items={day.items} />


        <ul className="mt-[18px] max-w-[640px] list-disc space-y-1.5 pl-5 text-[13.5px] text-muted">
          <li>
            Stop each set <b className="text-txt">1–2 reps short of failure</b>.
          </li>
          <li>Control the lowering (~2–3 sec).</li>
          <li>
            <span className="text-accent">★</span> = weak-point priority (delts &amp; upper back = the “built” look,
            fastest).
          </li>
        </ul>
      </Pad>
    </>
  )
}
