import { createFileRoute, Link } from '@tanstack/react-router'
import { Fragment } from 'react'
import { equipment, equipmentGroups } from '~/data'
import { ScreenHeader, Pad, BlockTitle } from '~/components/ScreenHeader'

export const Route = createFileRoute('/equipment/')({
  component: EquipmentGallery,
})

function EquipmentGallery() {
  return (
    <>
      <ScreenHeader title="Equipment" />
      <Pad>
        {equipmentGroups.map((g) => (
          <Fragment key={g.title}>
            <BlockTitle>{g.title}</BlockTitle>
            <div className="grid grid-cols-2 gap-3 min-[421px]:grid-cols-[repeat(auto-fill,minmax(215px,1fr))]">
              {g.ids.map((id) => {
                const e = equipment[id]
                return (
                  <Link
                    key={id}
                    to="/equipment/$id"
                    params={{ id }}
                    className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-panel hover:border-dim"
                  >
                    <img
                      loading="lazy"
                      src={e.photo}
                      alt={e.name}
                      className="aspect-[4/3] w-full bg-panel-2 object-cover"
                    />
                    <div className="px-3 pt-[11px] pb-3">
                      <div className="text-[13.5px] font-bold leading-[1.25] tracking-[-0.01em]">{e.name}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </Fragment>
        ))}
      </Pad>
    </>
  )
}
