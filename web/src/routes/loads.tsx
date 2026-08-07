import { createFileRoute, Link } from '@tanstack/react-router'
import { Fragment } from 'react'
import { loads, loadRowExercises } from '~/data'
import { ScreenHeader, Pad } from '~/components/ScreenHeader'

export const Route = createFileRoute('/loads')({
  component: Loads,
})

function Loads() {
  return (
    <>
      <ScreenHeader title="Load targets" tag="targets @ goal: 60 kg / 132 lb · 178 cm" />
      <Pad>
        <p className="mb-[18px] max-w-[640px] text-[14.5px] text-muted">
          These are <b className="text-txt">starting anchors for a lean beginner</b> — not rules. The real rule: pick a
          load where the <b className="text-txt">last 1–2 reps are genuinely hard</b> at the target reps. Then chase the
          3-month column with double progression (top of range → add weight → reset).
        </p>

        <div className="overflow-hidden rounded-card border border-line bg-panel">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Lift', 'Trains', 'Current', '3-mo target'].map((h, i) => (
                  <th
                    key={h}
                    className={
                      'bg-panel-2 px-[15px] py-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim ' +
                      (i >= 2 ? 'text-right' : 'text-left')
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loads.map((group) => (
                <Fragment key={group.title}>
                  <tr>
                    <td
                      colSpan={4}
                      className="border-b border-line bg-panel-2 px-[15px] py-[9px] text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-accent-2"
                    >
                      {group.title}
                    </td>
                  </tr>
                  {group.rows.map((r) => {
                    const exId = loadRowExercises(r)[0]
                    return (
                    <tr
                      key={r.name}
                      className={
                        'relative border-b border-line last:border-0 ' +
                        (exId ? 'hover:bg-panel-2' : '')
                      }
                    >
                      <td className="px-[15px] py-3 text-[13.5px] font-semibold text-txt">
                        {exId ? (
                          <Link to="/exercise/$id" params={{ id: exId }} className="after:absolute after:inset-0">
                            {r.star ? <span className="text-accent">★ </span> : null}
                            {r.name}
                          </Link>
                        ) : (
                          <>
                            {r.star ? <span className="text-accent">★ </span> : null}
                            {r.name}
                          </>
                        )}
                      </td>
                      <td className="px-[15px] py-3 text-[12.5px] text-muted">{r.trains}</td>
                      <td className="whitespace-nowrap px-[15px] py-3 text-right text-[13.5px] font-bold tabular-nums text-accent">
                        {r.current}
                      </td>
                      <td className="whitespace-nowrap px-[15px] py-3 text-right text-[13.5px] font-bold tabular-nums text-accent">
                        {r.target}
                      </td>
                    </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-card border border-warn-line bg-warn-tint px-4 py-3.5">
          <b className="text-warn">Calibrated to you</b>
          <p className="mt-[3px] text-[13px] text-muted">
            <b className="text-txt">Current</b> is your latest logged working weight, synced from Hevy;{' '}
            <b className="text-txt">targets</b> are a realistic 3-month climb for your goal body
            (<b className="text-txt">60 kg / 132 lb at 178 cm</b>) on <b className="text-txt">your machines</b> — the
            Technogym stacks top out around 72 kg / 160 lb, so machine targets respect that. The Olympic bar alone is{' '}
            <b className="text-txt">20 kg / 44 lb</b>. The <b className="text-txt">last-1–2-reps-hard</b> rule always
            decides the actual load.
          </p>
        </div>
      </Pad>
    </>
  )
}
