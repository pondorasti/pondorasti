import { Transition } from "@headlessui/react"
import React from "react"
import { NextSeo } from "next-seo"
import { useRouter } from "next/router"

interface ITransitionPage {
  children: React.ReactNode
  title: string
  description: string
  type?: "article" | "website"
}

const suffixTitle = "Alexandru Ţurcanu"

export default function TransitionPage({
  children,
  title,
  description,
  type = "website",
}: ITransitionPage): JSX.Element {
  const router = useRouter()

  return (
    <>
      <NextSeo
        title={router.asPath !== "/" ? `${title} - ${suffixTitle}` : title}
        description={description}
        canonical={`https://alexandru.so${router.asPath}`}
        openGraph={{
          type,
          locale: "en_IE",
          url: `https://alexandru.so${router.asPath}`,
          site_name: "Alexandru Ţurcanu",
        }}
        twitter={{
          site: "@pondorasti",
          cardType: "summary_large_image",
        }}
      />
      <Transition
        appear
        show
        as="div"
        enter="transition duration-500 ease-in-out"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition duration-500 ease-in-out"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        {children}
      </Transition>
    </>
  )
}
