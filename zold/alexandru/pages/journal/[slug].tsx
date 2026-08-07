import { GetStaticPropsContext } from "next"
import dynamic from "next/dynamic"
import fs from "fs"
import * as matter from "gray-matter"
import readingTime from "reading-time"
import JournalLayout from "@components/Journal/JournalLayout"
import { IMeta } from "@lib/types"
import LinkPreview from "@components/LinkPreview"
import Description from "@components/Description"
import { formatDate, normalizeUtc } from "@lib/date"
import TransitionPage from "@components/TransitionPage"

const entriesList = {
  "dns-ad-blocker-with-pi-hole-and-docker": dynamic(
    () => import("@data/journal/dns-ad-blocker-with-pi-hole-and-docker.mdx")
  ),
  "dynamic-programming-for-dummies": dynamic(() => import("@data/journal/dynamic-programming-for-dummies.mdx")),
  "gmail-automatic-forwarder": dynamic(() => import("@data/journal/gmail-automatic-forwarder.mdx")),
  "rfid-hacking-101": dynamic(() => import("@data/journal/rfid-hacking-101.mdx")),
  "custom-paging-ui-in-swiftui": dynamic(() => import("@data/journal/custom-paging-ui-in-swiftui.mdx")),
  "recreate-apples-breathing-animation-in-swiftui-part-2": dynamic(
    () => import("@data/journal/recreate-apples-breathing-animation-in-swiftui-part-2.mdx")
  ),
  "recreate-apples-breathing-animation-in-swiftui-part-1": dynamic(
    () => import("@data/journal/recreate-apples-breathing-animation-in-swiftui-part-1.mdx")
  ),
}

type Entries = typeof entriesList
type Slug = keyof Entries
interface IJournalEntry {
  meta: IMeta<Slug>
  readingTime: number
}

export default function JournalEntry({ meta, readingTime }: IJournalEntry): JSX.Element {
  const Entry = entriesList[meta.slug]

  return (
    <TransitionPage title={meta.title} description={meta.description} type="article">
      <div className="relative">
        <aside className="absolute top-0 -left-12 h-screen pr-11 text-left font-['Luxurious_Roman'] text-sm text-gray-400 [writing-mode:vertical-rl] dark:text-gray-600 md:-left-14">
          {formatDate(normalizeUtc(new Date(meta.publishedAt)))} • {readingTime} min read
        </aside>
      </div>
      <Description title={meta.title} description={meta.description} />
      <Entry
        components={{
          wrapper: ({ ...rest }) => <JournalLayout {...rest} />,
          a: props => <LinkPreview name={props.children as string} href={props.href || ""} alt="" />,
        }}
      />
    </TransitionPage>
  )
}

export async function getStaticProps({ params }: GetStaticPropsContext) {
  const slug = params?.slug as Slug
  const file = matter.read(`./data/journal/${slug}.mdx`)
  const meta = file.data as IMeta<Slug>
  const roundedReadingTime = Math.round(readingTime(file.content).minutes)

  return { props: { meta, readingTime: roundedReadingTime } }
}

export async function getStaticPaths() {
  const fileNames = fs.readdirSync("./data/journal")
  const paths = await Promise.all(
    fileNames.map(fileName => {
      const meta = matter.read(`./data/journal/${fileName}`).data as IMeta<Slug>
      return {
        params: {
          slug: meta.slug,
        },
      }
    })
  )

  return {
    paths,
    fallback: false,
  }
}
