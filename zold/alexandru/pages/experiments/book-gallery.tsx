import Description from "@components/Description"
import BookGalley from "@components/Experiments/BookGallery"
import TransitionPage from "@components/TransitionPage"

const title = "Book Gallery"
const description = "Skeuomorphic bookshelf"

export default function TimeMachine(): JSX.Element {
  return (
    <TransitionPage title={title} description={description}>
      <Description title={title} description={description} />
      <BookGalley />
    </TransitionPage>
  )
}
