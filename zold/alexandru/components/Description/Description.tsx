import { titleStyle, descriptionStyle } from "./styles"
import type { IDescription } from "./types"

export default function Description({ title, description, hideBreak = false }: IDescription): JSX.Element {
  return (
    <>
      <h1 className={titleStyle}>{title}</h1>
      <p className={descriptionStyle}>{description}</p>
      {!hideBreak && <hr />}
    </>
  )
}
