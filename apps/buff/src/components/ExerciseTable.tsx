import { Link } from '@tanstack/react-router'
import { equipment, itemName, itemPrimary, itemSecondary, type DayItem } from '~/data'

/** The routine-day exercise table. Rows with an `ex` id link to /exercise/$id
    via a stretched link (real <a>, whole row clickable). */
export function ExerciseTable({ items }: { items: DayItem[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-panel">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Exercise</Th>
            <Th>Equipment</Th>
            <Th right>Sets × Reps</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <Row key={i} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={
        'bg-panel-2 px-[15px] py-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim ' +
        (right ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  )
}

function Row({ item }: { item: DayItem }) {
  const name = itemName(item)
  const primary = itemPrimary(item)
  const secondary = itemSecondary(item)
  const linked = !!item.ex

  const nameBlock = (
    <>
      <span className="text-[13.5px] font-semibold text-txt">
        {item.star ? <span className="text-accent">★ </span> : null}
        {name}
        {linked ? <span className="ml-[7px] align-middle text-[9px] text-accent opacity-55">▶</span> : null}
      </span>
      <span className="mt-[3px] block text-[11.5px] font-medium text-dim">
        <b className="font-semibold text-accent-2">{primary}</b>
        {secondary.length ? <> · {secondary.join(', ')}</> : null}
      </span>
    </>
  )

  return (
    <tr
      className={
        'relative border-b border-line last:border-0 ' +
        (linked ? 'hover:bg-panel-2' : '')
      }
    >
      <td className="px-[15px] py-3">
        {linked ? (
          <Link
            to="/exercise/$id"
            params={{ id: item.ex! }}
            className="block after:absolute after:inset-0"
          >
            {nameBlock}
          </Link>
        ) : (
          nameBlock
        )}
      </td>
      <td className="px-[15px] py-3 text-[12.5px] text-muted">
        {equipment[item.gear].name}
        {item.hint ? <span className="text-dim"> · {item.hint}</span> : null}
      </td>
      <td className="whitespace-nowrap px-[15px] py-3 text-right text-[13.5px] font-bold tabular-nums text-accent">
        {item.sets}
      </td>
    </tr>
  )
}
