import { transition } from "@components/Experiments/BrowserFrame"
import clsx from "clsx"

const blobStyle = "h-16 w-16 rounded-full bg-black dark:bg-white transition-all"
const animateOnHoverStyle = "running group-hover:running sm:paused"

interface ILiquidBlob {
  animateOnHover?: boolean
}

export default function LiquidBlob({ animateOnHover }: ILiquidBlob): JSX.Element {
  return (
    <div className={clsx("flex items-center justify-center space-x-16 [filter:url(#blob)]", transition)}>
      <div className={clsx(blobStyle, "animate-blob-right", animateOnHover && animateOnHoverStyle)} />
      <div className={clsx(blobStyle, "animate-blob-left", animateOnHover && animateOnHoverStyle)} />
      <svg className="invisible absolute inset-0">
        <defs>
          <filter id="blob">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="gaussian-blur" />
            <feColorMatrix
              in="gaussian-blur"
              mode="matrix"
              values={`
                1 0 0 0 0  
                0 1 0 0 0  
                0 0 1 0 0  
                0 0 0 18 -8
              `}
              result="alpha-threshold"
            />
            <feBlend in="SourceGraphic" in2="alpha-threshold" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
