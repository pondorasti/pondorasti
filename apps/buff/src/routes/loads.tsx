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
      <ScreenHeader title="Load targets" />
      <Pad>
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

        <ul className="mt-[18px] max-w-[640px] list-disc space-y-1.5 pl-5 text-[13.5px] text-muted">
          <li>
            <b className="text-txt">Current</b> = your latest logged working weight, synced from Hevy.
          </li>
          <li>
            <b className="text-txt">Targets</b> = a realistic 3-month climb for your goal body (
            <b className="text-txt">60 kg / 132 lb at 178 cm</b>) on your machines — the Technogym stacks top out
            around 72 kg / 160 lb.
          </li>
          <li>
            The Olympic bar alone is <b className="text-txt">20 kg / 44 lb</b>.
          </li>
          <li>
            The <b className="text-txt">last-1–2-reps-hard</b> rule always decides the actual load.
          </li>
        </ul>
      </Pad>
    </>
  )
}
