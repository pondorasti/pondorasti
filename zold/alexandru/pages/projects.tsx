import { Fragment } from "react"
import Description from "@components/Description"
import LinkPreview from "@components/LinkPreview"
import clsx from "clsx"
import secrets from "@data/projects"
import TransitionPage from "@components/TransitionPage"

const title = "Projects"
const description = "Joyful selection of my work"

const headerStyling =
  "uppercase text-left text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap"
const rowStyling = "p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap"

export default function Projects(): JSX.Element {
  return (
    <TransitionPage title={title} description={description}>
      <Description title={title} description={description} />
      <div className="ml-12 overflow-x-auto overflow-y-hidden rounded-lg border shadow-lg border-divider md:ml-0">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 glass dark:bg-gray-900">
            <tr className="border-b border-divider">
              <th className={clsx(headerStyling, "p-3")}>Website</th>
              <th className={clsx(headerStyling, "p-3")}>Description</th>
            </tr>
          </thead>
          <tbody>
            {secrets.map((website, index) => (
              <Fragment key={website.name}>
                <tr className="absolute">
                  <td className="absolute -left-11 flex h-12 w-11 flex-col items-center justify-center p-0 pr-3">
                    <aside className={clsx("divider-y", index === 0 ? "opacity-0" : "")} />
                    {website.year && <aside className={clsx(headerStyling, "py-1")}>{website.year}</aside>}
                    <aside className={clsx("divider-y", index + 1 === secrets.length ? "opacity-0" : "")} />
                  </td>
                </tr>
                <tr
                  className={clsx(
                    index % 2 === 0 ? "bg-gray-200 dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900",
                    "glass"
                  )}
                >
                  <td className={rowStyling}>
                    <LinkPreview name={website.name} href={website.href} preview={website.preview} alt={website.name} />
                  </td>
                  <td className={rowStyling}>{website.description}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </TransitionPage>
  )
}
