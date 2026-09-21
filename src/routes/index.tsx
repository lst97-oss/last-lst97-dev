import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="mt-4 text-lg">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
      <nav className="mt-6 flex gap-4">
        <Link to="/admin" className="underline">
          Admin
        </Link>
        <Link to="/demo-query" className="underline">
          Query demo
        </Link>
        <Link to="/demo-form" className="underline">
          Form demo
        </Link>
        <Link to="/demo-theme" className="underline">
          Theme demo
        </Link>
      </nav>
    </div>
  )
}
