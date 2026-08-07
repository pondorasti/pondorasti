import { useRef, Fragment, useLayoutEffect } from "react"
import { useRouter } from "next/router"
import { useHotkeys } from "react-hotkeys-hook"
import { SearchIcon } from "@heroicons/react/solid"
import clsx from "clsx"
import type { IUserInformation, IUserInsights } from "@lib/types"
import Description from "@components/Description"
import TransitionPage from "@components/TransitionPage"
import useSWR from "swr"
import YearlyChart from "@components/Experiments/GithubContributions/YearlyChart"
import InsightsGroup from "@components/Experiments/GithubContributions/InsightsGroup"

const title = "Github Contributions"
const description = "visualize, analyze and contrast your commits"

export const DEFAULT_USERNAME = "pondorasti"
const fetcher = (username: string): Promise<IUserInformation> =>
  fetch(`/api/github-contributions?username=${username}`).then(res => res.json() as Promise<IUserInformation>)

const DEFAULT_INSIGHTS: IUserInsights = {
  longestStreak: 0,
  currentStreak: 0,
  totalContributions: 0,
  firstContributionDate: "",
}

export default function GithubContributions() {
  const usernameRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { search } = router.query

  const { data, error } = useSWR<IUserInformation, Error>(search, fetcher)
  const isLoading = !data && !error
  const insights = data?.insights || DEFAULT_INSIGHTS
  const collections = data?.collections || []

  // Update router based on input
  function handleInput() {
    const username = usernameRef.current?.value || ""

    // Only push router if it doesn't already have the same username
    if (search === username) return

    router.push("?search=" + username, undefined, { shallow: true })
  }

  // Synchronize input with router
  useLayoutEffect(() => {
    const usernameInput = usernameRef.current

    // exit early if it's rendering on the server
    if (!router.isReady) return

    // exit early if usernameRef is null
    if (!usernameInput) return

    // fallback to default username
    if (search === undefined) {
      usernameInput.value = DEFAULT_USERNAME
      router.push(`?search=${DEFAULT_USERNAME}`, undefined, { shallow: true })
    } else {
      usernameInput.value = String(search)
    }
  }, [search])

  // Focus input form based on hotkeys
  useHotkeys("⌘+k, ctrl+k, /", event => {
    event.preventDefault()
    usernameRef.current?.focus()
  })

  return (
    <TransitionPage title={title} description={description}>
      <div className={clsx("flex flex-col items-center", isLoading ? "cursor-wait" : "")}>
        <Description title={title} description={description} hideBreak />
        <form
          className="relative mb-7 w-full rounded-md shadow-sm md:w-96"
          onSubmit={event => {
            event.preventDefault()
            handleInput()
          }}
        >
          <input
            className={clsx(
              "block w-full rounded-lg border bg-white p-4 pr-14 text-xl border-divider glass dark:bg-gray-800 md:w-96",
              "focus:border-blue-300 focus:ring-blue-300 dark:focus:border-blue-900 dark:focus:ring-blue-900",
              isLoading ? "cursor-wait" : "cursor-auto"
            )}
            type="text"
            placeholder="username"
            ref={usernameRef}
          />
          <button className="absolute inset-y-0 right-0 flex items-center px-3" onClick={() => handleInput()}>
            {!isLoading ? (
              <SearchIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            ) : (
              <div className="flex h-8 w-8">
                <svg
                  className="m-auto h-6 w-6 animate-spin text-black dark:text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </button>
        </form>
      </div>
      <div
        className={clsx(
          "flex flex-col items-center",
          "transform transition duration-300 ease-out",
          isLoading || !error ? "opacity-0" : "opacity-100",
          isLoading || !error ? "" : "translate-y-4"
        )}
      >
        <p className="text-md mt-2 text-gray-400 dark:text-gray-500">
          Uh oh! It looks like the user you&apos;re looking for doesn&#39;t exist.
        </p>
      </div>

      <div
        className={clsx(
          "pb-0",
          "-translate-y-4 transform transition duration-300 ease-out",
          isLoading || error ? "opacity-0" : "opacity-100",
          isLoading || error ? "" : "translate-y-0"
        )}
      >
        {collections.map((collection, index) => (
          <Fragment key={index}>
            <YearlyChart key={index} collection={collection} />
            {index === 0 && (
              <>
                <InsightsGroup insights={insights} />
                <div className="divider-x mb-8" />
              </>
            )}
          </Fragment>
        ))}
      </div>
    </TransitionPage>
  )
}
