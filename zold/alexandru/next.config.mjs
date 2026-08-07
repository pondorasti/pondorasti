import rehypeHighlight from "rehype-highlight"
import remarkFrontmatter from "remark-frontmatter"
import nextMDX from "@next/mdx"
import PalettePlugin from "@palette.dev/webpack-plugin"

const withMDX = nextMDX({
  options: {
    remarkPlugins: [remarkFrontmatter],
    rehypePlugins: [rehypeHighlight],
  },
})

export default withMDX({
  images: {
    domains: ["alexandru.so"],
  },

  // Support MDX files as pages:
  pageExtensions: ["mdx", "tsx", "ts", "jsx", "js"],

  // Palette config
  webpack(config) {
    config.plugins.push(
      new PalettePlugin({
        key: process.env.PALETTE_ASSET_KEY,
        include: [".next/static"],
      })
    )
    return config
  },

  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Document-Policy",
            value: "js-profiling",
          },
        ],
      },
    ]
  },

  rewrites: async () => {
    return [
      {
        source: "/resume",
        destination: "/assets/resume.pdf",
      },
      {
        source: "/shokugeki",
        destination: "/secrets/shokugeki/index.html",
      },
      {
        source: "/secrets/teamo",
        destination: "/secrets/teamo/index.html",
      },
      {
        source: "/secrets/teamo-design",
        destination: "/secrets/teamo-design/index.html",
      },
      {
        source: "/secrets/github-contributions",
        destination: "/secrets/github-contributions/index.html",
      },
      {
        source: "/secrets/sushi",
        destination: "/secrets/sushi/index.html",
      },
      {
        source: "/secrets/amie",
        destination: "/secrets/amie/index.html",
      },
      {
        source: "/secrets/the-rise-of-micro-computers",
        destination: "/secrets/the-rise-of-micro-computers/index.html",
      },
      {
        source: "/secrets/90s-portfolio",
        destination: "/secrets/90s-portfolio/index.html",
      },
      {
        source: "/secrets/og-personal-website",
        destination: "/secrets/og-personal-website/index.html",
      },
      {
        source: "/secrets/og-personal-website/apps",
        destination: "/secrets/og-personal-website/apps/index.html",
      },
      {
        source: "/secrets/og-personal-website/awards",
        destination: "/secrets/og-personal-website/awards/index.html",
      },
      {
        source: "/secrets/og-personal-website/experience",
        destination: "/secrets/og-personal-website/experience/index.html",
      },
      {
        source: "/secrets/national-day",
        destination: "/secrets/national-day/index.html",
      },
      {
        source: "/secrets/microphone-wtf",
        destination: "/secrets/microphone-wtf/index.html",
      },
    ]
  },
})
