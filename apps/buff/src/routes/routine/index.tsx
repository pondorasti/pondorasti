import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/routine/')({
  beforeLoad: () => {
    throw redirect({ to: '/routine/$day', params: { day: 'push' } })
  },
})
