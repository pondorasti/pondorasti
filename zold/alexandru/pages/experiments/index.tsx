import Image from "next/image"
import Description from "@components/Description"
import TransitionPage from "@components/TransitionPage"
import BrowserFrame, { transition } from "@components/Experiments/BrowserFrame"
import LiquidBlob from "@components/Experiments/LiquidBlob"
import clsx from "clsx"
import BookGalley from "@components/Experiments/BookGallery"

const title = "Experiments"
const description = "Playground to try out new ideas"

export default function Experiments(): JSX.Element {
  return (
    <TransitionPage title={title} description={description}>
      <Description title={title} description={description} />
      <div className="flex flex-col space-y-8">
        {/* <BrowserFrame href="/experiments/time-machine" title="Time Machine">
          <div
            className={classNames(
              "relative flex w-full items-center justify-center opacity-80 group-hover:opacity-80 sm:opacity-40",
              transition
            )}
          >
            TODO: check if you can pause infinite animations
            <MockWebsite
              className="-translate-y-8 scale-90 opacity-0 group-hover:animate-grow-end"
              variation="original"
            />
            <MockWebsite className="-translate-y-4 scale-95 group-hover:animate-grow-middle" variation="playful" />
            <MockWebsite className="group-hover:animate-grow-start" variation="simple" />
          </div>
        </BrowserFrame> */}

        <BrowserFrame href="/experiments/book-gallery" title="Book Gallery" containerClassName="!h-96">
          <div
            className={clsx("pointer-events-none m-auto grayscale-0 group-hover:grayscale-0 sm:grayscale", transition)}
          >
            <BookGalley />
          </div>
        </BrowserFrame>

        <BrowserFrame href="/experiments/liquid-blob" title="Liquid Blob">
          <div className={clsx("m-auto invert-0 group-hover:invert-0 sm:invert-[0.50]", transition)}>
            <LiquidBlob animateOnHover />
          </div>
        </BrowserFrame>

        <BrowserFrame
          href="/experiments/github-contributions?search=pondorasti"
          title="Github Contributions"
          containerClassName="relative m-auto h-full w-full max-w-sm sm:max-w-md grayscale-0 group-hover:grayscale-0 sm:grayscale"
        >
          <Image
            src="/images/experiments/github-contributions.svg"
            alt="github contributions graph"
            layout="fill"
            className="dark-img-invert"
          />
        </BrowserFrame>
      </div>
    </TransitionPage>
  )
}
