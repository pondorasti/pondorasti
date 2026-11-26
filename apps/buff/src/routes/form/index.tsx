import { createFileRoute, redirect } from "@tanstack/react-router"
import { movements } from "~/form/catalog"

export const Route = createFileRoute("/form/")({
  beforeLoad: () => {
    throw redirect({ to: "/form/$id", params: { id: movements[0].id } })
  }
})
