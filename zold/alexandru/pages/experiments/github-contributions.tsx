import { SWRConfig } from "swr"
import GithubContributions, { DEFAULT_USERNAME } from "@components/Experiments/GithubContributions"
import { InferGetStaticPropsType } from "next"
import { getGithubContributions } from "pages/api/github-contributions"

export async function getStaticProps() {
  const data = await getGithubContributions(DEFAULT_USERNAME)

  return {
    props: {
      fallback: {
        [DEFAULT_USERNAME]: data,
      },
    },
    revalidate: 60,
  }
}

export default function GithubContributionsWrapper({ fallback }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <SWRConfig value={{ fallback }}>
      <GithubContributions />
    </SWRConfig>
  )
}
