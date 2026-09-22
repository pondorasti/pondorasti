import { describe, expect, test } from "vite-plus/test"
import { unwrapRasterSvg } from "../src/server/svg"
import { PNG } from "./fixtures"

const data = `data:image/png;base64,${btoa(String.fromCharCode(...PNG))}`
const wrapper = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700" viewBox="0 0 700 700"><image href="${data}" width="700" height="700"/></svg>`
const unwrap = (xml: string) =>
  new Uint8Array(unwrapRasterSvg(new TextEncoder().encode(xml).buffer))

describe("bitmap-only SVG wrappers", () => {
  test("extracts the original pixels without rendering or re-encoding", () => {
    expect(unwrap(wrapper)).toEqual(PNG)
    expect(
      unwrap(wrapper.replace("<image ", '<image preserveAspectRatio="xMidYMid meet" '))
    ).toEqual(PNG)
    expect(unwrap(`<?xml version="1.0"?>\n${wrapper}`)).toEqual(PNG)
    expect(
      unwrap(
        wrapper
          .replace('width="700"', 'xmlns:xlink="http://www.w3.org/1999/xlink" width="700"')
          .replace("href=", "xlink:href=")
      )
    ).toEqual(PNG)
  })

  test.each([
    wrapper.replace("</svg>", "<script>alert(1)</script></svg>"),
    wrapper.replace("</svg>", "<foreignObject/></svg>"),
    wrapper.replace("<image ", '<image onload="alert(1)" '),
    wrapper.replace("<image ", '<image style="filter:blur(2px)" '),
    wrapper.replace("<image ", '<image transform="rotate(45)" '),
    wrapper.replace("<image ", '<image preserveAspectRatio="none" '),
    wrapper.replace("<image ", '<image preserveAspectRatio="xMidYMid slice" '),
    wrapper.replace("<image ", '<image x="20" '),
    wrapper.replace("0 0 700 700", "0 0 100 100"),
    wrapper.replace("<image ", '<image width="2" '),
    wrapper.replace(data, "https://example.com/image.png"),
    wrapper.replace(data, "data:image/svg+xml;base64,PHN2Zy8+"),
    wrapper.replace(data, "data:image/png;base64,%%%="),
    wrapper.replace("http://www.w3.org/2000/svg", "http://example.com/svg"),
    wrapper.replace("/></svg>", "><svg/></image></svg>"),
    wrapper.replace("</svg>", "</svg><svg/>"),
    wrapper.replace("</svg>", "<image/></svg>"),
    wrapper.replace("<image ", '<image xmlns:xlink="http://www.w3.org/1999/xlink" '),
    `<!DOCTYPE svg [<!ENTITY image SYSTEM "file:///etc/passwd">]>${wrapper}`,
    `<?xml-stylesheet href="https://example.com/style.css"?>${wrapper}`,
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
    "<html></html>",
    "not an image"
  ])("rejects unsupported wrapper %#", (xml) => {
    expect(() => unwrap(xml)).toThrow("unsupported_image_bytes")
  })
})
