import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { equipmentUsage, getEquipment, itemName } from '~/data'
import { ScreenHeader, Pad, BlockTitle } from '~/components/ScreenHeader'

export const Route = createFileRoute('/equipment/$id')({
  loader: ({ params }) => {
    const eq = getEquipment(params.id)
    if (!eq) throw notFound()
    return { eq }
  },
  component: EquipmentPage,
})

function EquipmentPage() {
  const { eq } = Route.useLoaderData()
  const usage = equipmentUsage(eq.id)

  return (
    <>
      <ScreenHeader title={eq.name} />
      <Pad>
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="w-full max-w-[420px] flex-none">
            <img src={eq.photo} alt={eq.name} className="aspect-[4/3] w-full rounded-card border border-line bg-panel-2 object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            {usage.length > 0 ? (
              <>
                <BlockTitle>Used in your routine</BlockTitle>
                <div className="overflow-hidden rounded-card border border-line bg-panel">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="bg-panel-2 px-[15px] py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim">Exercise</th>
                        <th className="bg-panel-2 px-[15px] py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim">Day</th>
                        <th className="bg-panel-2 px-[15px] py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-dim">Sets × Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.map(({ day, item }, i) => (
                        <tr key={i} className="relative border-b border-line last:border-0 hover:bg-panel-2">
                          <td className="px-[15px] py-3 text-[13.5px] font-semibold text-txt">
                            {item.ex ? (
                              <Link to="/exercise/$id" params={{ id: item.ex }} className="after:absolute after:inset-0">
                                {item.star ? <span className="text-accent">★ </span> : null}
                                {itemName(item)}
                              </Link>
                            ) : (
                              <>
                                {item.star ? <span className="text-accent">★ </span> : null}
                                {itemName(item)}
                              </>
                            )}
                          </td>
                          <td className="px-[15px] py-3 text-[12.5px] text-muted">{day.name}</td>
                          <td className="whitespace-nowrap px-[15px] py-3 text-right text-[13.5px] font-bold tabular-nums text-accent">
                            {item.sets}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-line bg-panel px-[15px] py-[13px] text-[12.5px] text-muted">
                Not currently programmed in your routine — available for cardio, warm-ups, or accessories.
              </div>
            )}
          </div>
        </div>
      </Pad>
    </>
  )
}
