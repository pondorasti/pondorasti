import clsx from "clsx"
import Link from "next/link"
import { MinusIcon, XIcon } from "@heroicons/react/solid"
import {
  circleIconStyle,
  circleStyle,
  frameStyle,
  IBrowserFrame,
  tabStyle,
  transition,
  wrapperStyle,
} from "../BrowserFrame"

interface IInteractiveBrowserFrame extends IBrowserFrame {
  index: number
  onClose?: () => void
  onMinimize?: () => void
  onExpand?: () => void
}

export default function InteractiveBrowserFrame({
  children,
  href,
  title,
  index,
  onClose,
  onMinimize,
  onExpand,
}: IInteractiveBrowserFrame): JSX.Element {
  return (
    <div
      key={index}
      className="-translate-4 absolute h-full w-full"
      style={{
        zIndex: 100 - index,
        // opacity: 1 - 0.1 * index,
        transform: `translateY(${-26 * index * (1 - 0.02 * index)}px) scaleY(${1 - 0.05 * index}) scaleX(${
          1 - 0.05 * index
        })`,
      }}
    >
      <div className={clsx(wrapperStyle, transition)}>
        <div
          className={clsx(
            "relative flex h-12 w-full flex-row items-center space-x-2 px-4",
            "bg-gray-100 text-gray-500 dark:bg-gray-800",
            "group-hover:text-gray-700 dark:group-hover:text-gray-300"
          )}
        >
          <button className={clsx(circleStyle, "group-hover:bg-systemRed", transition)} onClick={onClose}>
            <XIcon className={circleIconStyle} />
          </button>
          <button className={clsx(circleStyle, "group-hover:bg-systemYellow", transition)} onClick={onMinimize}>
            <MinusIcon className={circleIconStyle} />
          </button>
          <button className={clsx(circleStyle, "group-hover:bg-systemGreen", transition)} onClick={onExpand}>
            <MinusIcon className={circleIconStyle} />
          </button>

          <span className="flex-grow" />

          <div className="absolute left-0 !ml-0 w-full">
            <Link href={href} passHref>
              {/* TODO: fix me into an <a /> */}
              <div className={clsx(tabStyle, "cursor-ne-resize", transition)}>{title}</div>
            </Link>
          </div>
        </div>
        <div className={clsx(frameStyle, "h-full", transition)}>{children}</div>
      </div>
    </div>
  )
}
