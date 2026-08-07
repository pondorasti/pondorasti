import type { NextApiRequest, NextApiResponse } from "next"
import privateClient from "@lib/supabase/private"
import { normalizeUtc } from "@lib/date"
import type { IContributionsCollection, IUserInformation, IUserCache } from "@lib/types"

const api = "https://api.github.com/graphql"
const ghToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN ?? ""
const ghHeaders = { Authorization: `bearer ${ghToken}` }

async function fetchYearlyContributions(username: string | string[], year: number): Promise<IContributionsCollection> {
  const body = {
    query: `query {
        user(login: "${username}") {
          contributionsCollection(from: "${year}-01-01T00:00:00.000Z", to: "${year}-12-31T00:00:00.000Z") {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  color
                  contributionCount
                  contributionLevel
                  date
                }
              }
            }
          }
        }
      }`,
  }

  const response = await fetch(api, {
    method: "POST",
    body: JSON.stringify(body),
    headers: ghHeaders,
  })

  const data = (await response.json()) as IContributionsCollection
  data.data.user.contributionsCollection.year = year

  return data
}

export async function getGithubContributions(username: string): Promise<IUserInformation> {
  const body = {
    query: `query {
        user(login: "${username}") {
          contributionsCollection {
            contributionYears
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  color
                  contributionCount
                  contributionLevel
                  date
                }
              }
            }
          }
        }
      }`,
  }

  // Fetch contributions in the last year
  const response = await fetch(api, {
    method: "POST",
    body: JSON.stringify(body),
    headers: ghHeaders,
  })
  const collections: IContributionsCollection[] = []
  const currentCollection = (await response.json()) as IContributionsCollection
  collections.push(currentCollection)

  if (currentCollection.data.user === null) {
    throw new Error("User not found.")
  }

  // Fetch cached contributions history
  const { data, error } = await privateClient.from("github-contributions").select().match({ username })
  if (data === null || error) throw new Error(error?.message)

  // Fetch missing contributions years
  const years = currentCollection.data.user.contributionsCollection.contributionYears

  let longestStreak = 0
  let currentStreak = -1
  let potentialStreak = 0
  let totalContributions = 0
  let firstContributionDate = ""
  const today = normalizeUtc(new Date()).toISOString().split("T")[0]
  for (const year of years) {
    // Resolve collection from cache or by fetching it
    let resolvedCollection: IContributionsCollection
    const cachedYear: IUserCache = data.find((element: IUserCache) => element.year === year)
    if (cachedYear === undefined) {
      const collection = fetchYearlyContributions(username, year)
      resolvedCollection = await collection

      // Cache result except current year (in order to avoid caching and freezing current year data)
      if (resolvedCollection.data.user.contributionsCollection.year !== new Date().getFullYear()) {
        await privateClient.from("github-contributions").upsert({ username, year, contributions: resolvedCollection })
      }
    } else {
      resolvedCollection = cachedYear.contributions
    }
    collections.push(resolvedCollection)

    // Gather stats
    const contributionCalendar = resolvedCollection.data.user.contributionsCollection.contributionCalendar
    const contributions = contributionCalendar.weeks
    totalContributions += contributionCalendar.totalContributions
    for (const contribution of [...contributions].reverse()) {
      for (const day of [...contribution.contributionDays].reverse()) {
        if (day.contributionCount === 0) {
          longestStreak = Math.max(potentialStreak, longestStreak)
          if (currentStreak === -1 && day.date < today) {
            currentStreak = Math.max(potentialStreak, currentStreak)
          }

          potentialStreak = 0
        } else {
          potentialStreak += 1
          firstContributionDate = day.date
        }
      }
    }
  }

  return { collections, insights: { longestStreak, currentStreak, totalContributions, firstContributionDate } }
}

export default async (req: NextApiRequest, res: NextApiResponse<IUserInformation>) => {
  const { username } = req.query
  const data = await getGithubContributions(String(username))

  res.status(200).json(data)
}
