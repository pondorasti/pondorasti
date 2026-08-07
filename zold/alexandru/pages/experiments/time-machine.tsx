import Description from "@components/Description"
import TransitionPage from "@components/TransitionPage"
import { useState } from "react"
import InteractiveBrowserFrame from "@components/Experiments/TimeMachine/InteractiveBrowserFrame"

const data = [
  { href: "https://alexandru.so", title: "Today" },
  { href: "https://alexandru.so", title: "Today" },
  { href: "https://alexandru.so", title: "Today" },
  { href: "https://alexandru.so", title: "Today" },
  { href: "https://alexandru.so", title: "Today" },
]

const title = "Time Machine"
const description = "Explore my website through progression of time"

export default function TimeMachine(): JSX.Element {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // TODO: disable body scroll on fullscreen
  return (
    <TransitionPage title={title} description={description}>
      <Description title={title} description={description} />
      <div className="relative mt-32 h-96">
        {data.map(({ href, title }, index) => (
          <InteractiveBrowserFrame key={index} href={href} title={title} index={index}>
            <iframe src={href} className="h-full w-full" />
          </InteractiveBrowserFrame>
        ))}
      </div>
    </TransitionPage>
  )
}
