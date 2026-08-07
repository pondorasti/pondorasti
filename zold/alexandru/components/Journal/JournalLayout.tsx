import Head from "next/head"

export default function Layout({ children }: { children: JSX.Element }) {
  return (
    <article className="prose prose-neutral prose-headings:font-['IBM_Plex_Sans'] prose-headings:font-medium prose-a:no-underline prose-pre:rounded-lg prose-ul:my-5 prose-img:rounded-xl dark:prose-invert">
      <Head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/github-dark.min.css"
        />
      </Head>

      {/* Book Binding */}
      <div className="fixed top-0 -ml-6 h-full border-l-2 border-dotted border-divider" />

      {children}
    </article>
  )
}
