import NextImage from "next/image"
import clsx from "clsx"

interface IFancyImage {
  src: string
  alt: string
  width: number
  height: number
  caption?: JSX.Element
  className?: string
}

export default function FancyImage({ src, alt, width, height, caption, className }: IFancyImage): JSX.Element {
  return (
    <div className="flex flex-col items-center ">
      <span className={clsx(className || "", "overflow-hidden rounded-xl")}>
        <NextImage src={src} alt={alt} width={width} height={height} placeholder="blur" blurDataURL={src} />
      </span>
      {caption && <p className="mt-2 mb-0 text-sm font-light text-gray-600 dark:text-gray-400">{caption}</p>}
    </div>
  )
}
