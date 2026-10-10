import { describe, expect, it } from "vite-plus/test"
import { parseItem, renderNotes } from "./parse"

const images =
  (...files: string[]) =>
  (file: string) =>
    files.includes(file) ? `/images/${file}` : undefined

const item = (front: string, notes = "") => `---\n${front}\n---\n${notes}`

describe("content items", () => {
  it("parses front matter and renders notes", () => {
    const parsed = parseItem(
      "desk-lamp",
      item(
        'name: "Desk Lamp: Mk 2"\nvariant: Brass\nstatus: owned\ntag: office\nlink: https://example.com/lamp',
        "- **Bulb:** LED"
      ),
      images("image.webp")
    )
    expect(parsed).toEqual({
      slug: "desk-lamp",
      name: "Desk Lamp: Mk 2",
      status: "owned",
      tag: "office",
      variant: "Brass",
      link: "https://example.com/lamp",
      image: "/images/image.webp",
      notes: "<ul>\n<li><strong>Bulb:</strong> LED</li>\n</ul>"
    })
  })

  it("rejects unknown or multiple tags, statuses and keys, missing images and bad folder names", () => {
    const parse =
      (slug: string, front: string, files = ["image.webp"]) =>
      () =>
        parseItem(slug, item(front), images(...files))
    expect(parse("lamp", "name: Lamp\nstatus: owned\ntag: lamps")).toThrow(/tag/)
    expect(parse("lamp", "name: Lamp\nstatus: owned\ntag: [office, carry]")).toThrow(/tag/)
    expect(parse("lamp", "name: Lamp\nstatus: owned")).toThrow(/tag/)
    expect(parse("lamp", "name: Lamp\nstatus: lent\ntag: office")).toThrow(/status/)
    expect(parse("lamp", "name: Lamp\nstatus: owned\ntags: [office]")).toThrow(/tags/)
    expect(
      parse("lamp", "name: Lamp\nstatus: owned\ntag: office\nlink: javascript:alert(1)")
    ).toThrow(/link/)
    expect(parse("lamp", "name: Lamp\nstatus: owned\ntag: office", [])).toThrow(
      "missing image.webp"
    )
    expect(parse("Desk_Lamp", "name: Lamp\nstatus: owned\ntag: office")).toThrow(/folder name/)
    expect(() => parseItem("lamp", "name: Lamp", images("image.webp"))).toThrow(/front matter/)
  })

  it("shifts headings under the page's Notes heading and keeps links and HTML safe", () => {
    const html = renderNotes(
      "## Specs\n\n[Site](https://example.com) [bad](javascript:alert(1)) <script>x</script>",
      images()
    )
    expect(html).toContain("<h3>Specs</h3>")
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noreferrer">Site</a>'
    )
    expect(html).not.toContain("javascript:")
    expect(html).toContain("&lt;script&gt;")
  })

  it("resolves note images from the item folder and fails on missing ones", () => {
    expect(renderNotes("![Receipt](notes-1.webp)", images("notes-1.webp"))).toContain(
      '<img src="/images/notes-1.webp" alt="Receipt" loading="lazy">'
    )
    expect(() => renderNotes("![Receipt](notes-2.webp)", images())).toThrow(/notes-2.webp/)
  })
})
