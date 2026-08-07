// Github Contributions
export interface IContributionWeek {
  color: string
  contributionCount: number
  contributionLevel: "NONE" | "FIRST_QUARTILE" | "SECOND_QUARTILE" | "THIRD_QUARTILE" | "FOURTH_QUARTILE"
  date: string
}

export interface IContributionsCollection {
  data: {
    user: {
      contributionsCollection: {
        year?: number
        contributionYears: number[]
        contributionCalendar: {
          totalContributions: number
          weeks: {
            contributionDays: IContributionWeek[]
          }[]
        }
      }
    }
  }
}

export interface IUserCache {
  username: string
  year: number
  contributions: IContributionsCollection
}

export interface IUserInsights {
  longestStreak: number
  currentStreak: number
  totalContributions: number
  firstContributionDate: string
}
export interface IUserInformation {
  collections: IContributionsCollection[]
  insights: IUserInsights
}

// Journal
export interface IMeta<Slug> {
  slug: Slug
  title: string
  description: string
  publishedAt: string
}
