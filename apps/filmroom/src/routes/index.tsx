import { createFileRoute } from "@tanstack/react-router"
import { cx } from "~/components/controls"
import { Filmstrip } from "~/components/filmstrip"
import { Header } from "~/components/header"
import { Help } from "~/components/help"
import { Inspector } from "~/components/inspector"
import { Stage } from "~/components/stage"
import { Toaster } from "~/components/toaster"
import { useFilmroom } from "~/viewer/use-filmroom"

export const Route = createFileRoute("/")({
  component: Filmroom
})

function Filmroom() {
  const app = useFilmroom()
  return (
    <div
      className={cx(
        "flex min-h-155 flex-col sm:h-dvh sm:min-h-115 sm:overflow-hidden",
        app.sidebar
          ? "sm:[--sidebar:165px] md:[--sidebar:196px] lg:[--sidebar:228px]"
          : "[--sidebar:0px]",
        app.inspector
          ? "sm:[--inspector:214px] md:[--inspector:234px] lg:[--inspector:258px]"
          : "[--inspector:0px]"
      )}
    >
      <Header app={app} />
      <div className="flex min-h-0 flex-1 flex-col sm:grid sm:grid-cols-[var(--sidebar)_minmax(0,1fr)_var(--inspector)]">
        {app.sidebar && <Filmstrip app={app} />}
        <Stage app={app} />
        {app.inspector && <Inspector app={app} />}
      </div>
      <Help app={app} />
      <Toaster />
    </div>
  )
}
