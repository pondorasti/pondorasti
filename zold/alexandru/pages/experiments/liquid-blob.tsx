import Description from "@components/Description"
import TransitionPage from "@components/TransitionPage"
import LiquidBlob from "@components/Experiments/LiquidBlob"

const title = "Liquid Blob"
const description = "Metaballs inspired by Apple's Dynamic Island"

export default function TimeMachine(): JSX.Element {
  return (
    <TransitionPage title={title} description={description}>
      <Description title={title} description={description} />
      <LiquidBlob />
    </TransitionPage>
  )
}
