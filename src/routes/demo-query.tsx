import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/demo-query')({ component: DemoQuery })

function DemoQuery() {
  const query = useQuery({
    queryKey: ['payload-access'],
    queryFn: async () => {
      const res = await fetch('/api/access')
      if (!res.ok) {
        throw new Error(`Payload /api/access failed: ${res.status}`)
      }
      return (await res.json()) as unknown
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Query → Payload REST</h1>
      <p className="mt-2 text-sm opacity-70">
        useQuery fetches <code>/api/access</code> through the Payload REST route.
      </p>
      {query.isPending ? <p className="mt-4">Loading…</p> : null}
      {query.isError ? <p className="mt-4 text-red-600">{String(query.error)}</p> : null}
      {query.data ? (
        <pre className="mt-4 overflow-auto rounded bg-black/5 p-4 text-xs">
          {JSON.stringify(query.data, null, 2).slice(0, 2000)}
        </pre>
      ) : null}
    </div>
  )
}
