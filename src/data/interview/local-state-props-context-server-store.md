# When should you use local component state, props, context, or a server-side data store?

- **Category:** Fundamental Questions
- **Source ID:** local-state-props-context-server-store
- **URL:** https://www.lst97.dev/chat

Based on my understanding, and please correct me if I am wrong, when you mention local component state, I assume this can include hooks, Zustand, or local storage depending on the situation. For simple persistent values such as user preferences or theme selection, we can use local storage. For hooks, I usually use them for things such as forms or UI state where the value frequently changes based on user behaviour. For more complex state that needs to be shared across different areas of the application, or when storing more complex objects, I would recommend Zustand because it is lightweight and relatively easy to understand. If we are building the application with TanStack Start, we can also use TanStack Store to maintain consistency within the TanStack ecosystem.
