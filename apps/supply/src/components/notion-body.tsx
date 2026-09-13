import { CheckSquare, Square } from "lucide-react"
import type { ReactNode } from "react"
import { imagePath, safeLink, type ContentBlock, type TextRun } from "../catalog"

function RichText({ runs }: { runs: TextRun[] }) {
  return runs.map((run, index) => {
    let content: ReactNode = run.text
    if (run.code) content = <code>{content}</code>
    if (run.bold) content = <strong>{content}</strong>
    if (run.italic) content = <em>{content}</em>
    if (run.strike) content = <s>{content}</s>
    const href = safeLink(run.href)
    return (
      <span key={index} className="whitespace-pre-wrap">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            {content}
          </a>
        ) : (
          content
        )}
      </span>
    )
  })
}

function Block({ block }: { block: ContentBlock }) {
  const text = <RichText runs={block.text} />
  const children = block.children.length > 0 && (
    <div className="mt-3 space-y-4">
      <NotionBody blocks={block.children} />
    </div>
  )
  switch (block.type) {
    case "heading_1":
      return (
        <>
          <h2>{text}</h2>
          {children}
        </>
      )
    case "heading_2":
      return (
        <>
          <h3>{text}</h3>
          {children}
        </>
      )
    case "heading_3":
      return (
        <>
          <h4>{text}</h4>
          {children}
        </>
      )
    case "quote":
    case "callout":
      return (
        <blockquote>
          {text}
          {children}
        </blockquote>
      )
    case "divider":
      return <hr className="border-line" />
    case "code":
      return (
        <>
          <pre>
            <code>{text}</code>
          </pre>
          {children}
        </>
      )
    case "toggle":
      return (
        <details>
          <summary>{text}</summary>
          {children}
        </details>
      )
    case "to_do":
      return (
        <div className="flex items-start gap-2">
          {block.checked ? (
            <CheckSquare size={16} className="mt-1.5 shrink-0" />
          ) : (
            <Square size={16} className="mt-1.5 shrink-0" />
          )}
          <div>
            {text}
            {children}
          </div>
        </div>
      )
    case "image":
      return (
        <figure>
          {block.image && (
            <img
              src={imagePath(block.image)}
              alt={block.text.map((run) => run.text).join("")}
              loading="lazy"
              className="max-h-[720px] w-full rounded-md object-contain"
            />
          )}
          {block.text.length > 0 && (
            <figcaption className="mt-2 text-center text-xs">{text}</figcaption>
          )}
          {children}
        </figure>
      )
    default:
      return (
        <>
          {block.text.length > 0 && <p>{text}</p>}
          {children}
        </>
      )
  }
}

export function NotionBody({ blocks }: { blocks: ContentBlock[] }) {
  const elements: ReactNode[] = []
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]
    if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
      const list = [block]
      while (blocks[index + 1]?.type === block.type) list.push(blocks[++index])
      const Tag = block.type === "bulleted_list_item" ? "ul" : "ol"
      elements.push(
        <Tag key={block.id}>
          {list.map((item) => (
            <li key={item.id}>
              <RichText runs={item.text} />
              {item.children.length > 0 && (
                <div className="mt-2">
                  <NotionBody blocks={item.children} />
                </div>
              )}
            </li>
          ))}
        </Tag>
      )
    } else {
      elements.push(<Block key={block.id} block={block} />)
    }
  }
  return elements
}
