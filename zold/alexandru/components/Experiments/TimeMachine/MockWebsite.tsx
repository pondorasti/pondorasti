import clsx from "clsx"

interface IMockWebsite {
  className?: string
  variation: "playful" | "simple" | "original"
}

const titleStyle = "h-2.5 w-16 rounded-full bg-white/25 xs:h-3"
const descriptionStyle = "mt-2.5 h-2.5 w-28 rounded-full bg-white/10 xs:mt-3 xs:h-3 xs:w-32"
const cardStyle = "h-12 w-12 rounded-lg bg-white/10 xs:h-16 xs:w-16 xs:rounded-xl"
const backgroundStyle = "flex h-full items-center justify-center bg-gray-400/25 dark:bg-gray-500/25 p-4 xs:p-8"

function Original(): JSX.Element {
  return (
    <div className={clsx("flex-col", backgroundStyle)}>
      <div className="h-24 w-24 rounded-2xl bg-white/10 xs:h-28 xs:w-28 xs:rounded-3xl" />
      <div className={clsx(titleStyle, "mt-6 xs:mt-8")} />
      <div className={descriptionStyle} />
    </div>
  )
}

function Playful(): JSX.Element {
  return (
    <div className={clsx(backgroundStyle)}>
      <div className={clsx("inline-flex h-full flex-col items-center justify-center")}>
        <div className="flex w-full flex-col items-start">
          <div className={titleStyle} />
          <div className={descriptionStyle} />
        </div>
        <div className="mt-8 flex flex-row flex-nowrap space-x-4 xs:mt-12">
          <div className={clsx(cardStyle, "-rotate-3")} />
          <div className={clsx(cardStyle, "rotate-3")} />
          <div className={clsx(cardStyle, "-rotate-3")} />
          <div className={clsx(cardStyle, "rotate-3")} />
        </div>
      </div>
    </div>
  )
}

function Simple(): JSX.Element {
  return (
    <div className={clsx("flex-col", backgroundStyle)}>
      <div className={titleStyle} />
      <div className={descriptionStyle} />
      <div className="mt-8 flex flex-row flex-nowrap space-x-4 xs:mt-12">
        <div className={cardStyle} />
        <div className={cardStyle} />
        <div className={cardStyle} />
      </div>
    </div>
  )
}

export default function MockWebsite({ className, variation }: IMockWebsite): JSX.Element {
  let children: React.ReactNode = Simple()
  switch (variation) {
    case "original":
      children = Original()
      break
    case "playful":
      children = Playful()
      break
    case "simple":
      children = Simple()
      break
  }

  return (
    <div
      className={clsx(
        "absolute h-full w-full max-w-md overflow-hidden rounded-lg bg-black ring-1 ring-gray-650",
        className ?? ""
      )}
    >
      {children}
    </div>
  )
}
