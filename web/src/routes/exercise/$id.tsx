import { Fragment } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { equipment, exerciseUsage, getExercise, loadsForExercise } from '~/data'
import { ScreenHeader, Pad, BlockTitle } from '~/components/ScreenHeader'

export const Route = createFileRoute('/exercise/$id')({
  loader: ({ params }) => {
    const ex = getExercise(params.id)
    if (!ex) throw notFound()
    return { ex }
  },
  component: ExercisePage,
})

function ExercisePage() {
  const { ex } = Route.useLoaderData()
  const usage = exerciseUsage(ex.id)
  const loadRows = loadsForExercise(ex.id)
  const gearIds = [...new Set(usage.map((u) => u.item.gear))]

  return (
    <>
      <ScreenHeader title={ex.name} />
      <Pad>
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          {/* demo */}
          <div className="w-full max-w-[340px] flex-none">
            <img src={ex.gif} alt={`${ex.name} demonstration`} className="aspect-square w-full rounded-xl bg-white object-contain" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-accent px-2.5 py-[3px] text-[11px] font-bold text-accent-fg">
                {ex.primary}
              </span>
              {ex.secondary.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-line bg-panel-2 px-2.5 py-[3px] text-[11px] text-muted"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-[1.4] text-dim">
              Red = muscles worked. Demo art{' '}
              <a href="https://gymvisual.com/" target="_blank" rel="noopener" className="text-muted underline-offset-2 hover:underline">
                © Gym Visual
              </a>{' '}
              — form reference, not your exact machine.
            </p>
          </div>

          <div className="min-w-0 flex-1">
            {/* in your routine */}
            <BlockTitle>In your routine</BlockTitle>
            <div className="overflow-hidden rounded-card border border-line bg-panel">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-panel-2 px-[15px] py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim">Day</th>
                    <th className="bg-panel-2 px-[15px] py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim">Equipment</th>
                    <th className="bg-panel-2 px-[15px] py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim">Sets × Reps</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map(({ day, item }, i) => (
                    <tr key={i} className="relative border-b border-line last:border-0 hover:bg-panel-2">
                      <td className="px-[15px] py-3 text-[13.5px] font-semibold text-txt">
                        <Link to="/routine/$day" params={{ day: day.slug }} className="after:absolute after:inset-0">
                          {day.name}
                        </Link>
                      </td>
                      <td className="px-[15px] py-3 text-[12.5px] text-muted">
                        {item.star ? <span className="text-accent">★ </span> : null}
                        {equipment[item.gear].name}
                        {item.hint ? <span className="text-dim"> · {item.hint}</span> : null}
                      </td>
                      <td className="whitespace-nowrap px-[15px] py-3 text-right text-[13.5px] font-bold tabular-nums text-accent">
                        {item.sets}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* load targets */}
            {loadRows.length > 0 && (
              <>
                <BlockTitle>Load targets</BlockTitle>
                <div className="grid grid-cols-2 gap-3">
                  {loadRows.map((r) => (
                    <Fragment key={r.name}>
                      <div className="rounded-card border border-line bg-panel p-4">
                        <div className="mb-[5px] text-[11px] uppercase tracking-[0.08em] text-dim">Current</div>
                        <div className="text-[20px] font-extrabold tracking-[-0.02em] text-accent">{r.current}</div>
                      </div>
                      <div className="rounded-card border border-line bg-panel p-4">
                        <div className="mb-[5px] text-[11px] uppercase tracking-[0.08em] text-dim">3-mo target</div>
                        <div className="text-[20px] font-extrabold tracking-[-0.02em] text-accent">{r.target}</div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </>
            )}

            {/* equipment used */}
            <BlockTitle>Equipment you'll use</BlockTitle>
            <div className="flex flex-col gap-2">
              {gearIds.map((gid) => {
                const g = equipment[gid]
                return (
                  <Link
                    key={gid}
                    to="/equipment/$id"
                    params={{ id: gid }}
                    className="flex items-center gap-3 rounded-card border border-line bg-panel p-2.5 hover:border-dim"
                  >
                    <img src={g.photo} alt={g.name} className="h-[58px] w-[58px] flex-none rounded-[10px] bg-panel-2 object-cover" />
                    <div className="text-xs text-muted">
                      Your gym · <b className="font-semibold text-txt">{g.name}</b>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </Pad>
    </>
  )
}
