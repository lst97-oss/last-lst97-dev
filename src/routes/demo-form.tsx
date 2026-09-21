import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'
import { demoStore } from '../lib/demo-store'

export const Route = createFileRoute('/demo-form')({ component: DemoForm })

function DemoForm() {
  const count = useStore(demoStore, (state) => state.count)
  const lastName = useStore(demoStore, (state) => state.lastName)
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: ({ value }) => {
      demoStore.setState((state) => ({
        ...state,
        count: state.count + 1,
        lastName: value.name,
      }))
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Form → Store</h1>
      <p className="mt-2 text-sm opacity-70">
        Submit writes into the TanStack Store; the readout below proves the wiring.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field name="name">
          {(field) => (
            <input
              className="rounded border px-3 py-2"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Your name"
              value={field.state.value}
            />
          )}
        </form.Field>
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">
          Submit
        </button>
      </form>
      <p className="mt-4" data-testid="store-readout">
        Submitted {count} times{lastName ? `, last name: ${lastName}` : ''}.
      </p>
    </div>
  )
}
