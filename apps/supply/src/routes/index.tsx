import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: Catalog })

function Catalog() {
  return (
    <main>
      <h1>Supply</h1>
    </main>
  )
}
