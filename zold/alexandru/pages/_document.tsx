import NextDocument, { Html, Head, Main, NextScript } from "next/document"

export default class Document extends NextDocument {
  render(): JSX.Element {
    return (
      <Html lang="en" className="nightwind h-full">
        <Head>
          {/* Favicon */}
          <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
          <link rel="manifest" href="/favicons/site.webmanifest" />
          <link rel="shortcut icon" href="/favicons/favicon.ico" />

          {/* Fonts */}
          {/* <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> */}
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=IBM+Plex+Sans:wght@500&family=Luxurious+Roman&display=swap"
            rel="stylesheet"
          />
        </Head>
        {/* dark:selection:bg-fuchsia-600 dark:selection:text-fuchsia-50 */}
        <body className="bg-gray-50 selection:bg-teal-300 selection:text-gray-800 dark:bg-gray-900 dark:selection:bg-rose-600 dark:selection:text-rose-50">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
