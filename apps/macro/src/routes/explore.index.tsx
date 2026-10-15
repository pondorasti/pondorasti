import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { DIRECTIONS, loadExploreDay, validateExploreSearch } from "../explore/shared"
import { dateLong } from "../lib/format"

export const Route = createFileRoute("/explore/")({
  validateSearch: validateExploreSearch,
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ context, deps }) => {
    const date = await loadExploreDay(context.queryClient, deps.date)
    if (!date) throw notFound()
    return date
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({ meta: [{ title: "Label explorations | Macro" }] }),
  component: Explore
})

function Explore() {
  const date = Route.useLoaderData()
  return (
    <main id="main" className="mx-auto w-full max-w-[1600px] px-4 pb-16 lg:px-6">
      <p className="eyebrow mt-6">Nutrition label explorations · {dateLong(date)}</p>
      <h1 className="display mt-1 mb-8">One label for the whole day</h1>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {DIRECTIONS.map((direction) => (
          <section key={direction.id} className="min-w-0">
            <Link
              to={direction.to}
              search={{ date }}
              className="group mb-3 flex items-start justify-between gap-3"
            >
              <span>
                <span className="font-medium">
                  <span className="mr-2 uppercase">{direction.id}</span>
                  {direction.name}
                </span>
                <span className="block text-sm text-muted">{direction.blurb}</span>
              </span>
              <ArrowUpRight
                size={18}
                className="mt-0.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
            <iframe
              title={`${direction.name} preview`}
              src={`${direction.to}?date=${date}`}
              loading="lazy"
              className="h-[880px] w-full rounded-2xl border border-line bg-page"
            />
          </section>
        ))}
      </div>
    </main>
  )
}
