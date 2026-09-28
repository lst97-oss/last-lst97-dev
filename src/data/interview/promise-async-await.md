# What is the difference between Promise, async, and await?

- **Category:** Fundamental Questions
- **Source ID:** promise-async-await
- **URL:** https://www.lst97.dev/chat

I find this question a little abstract because, in practice, async, Promise, and await are usually used together. When we use an async function, the operation does not necessarily complete immediately. The JavaScript engine can handle asynchronous operations without blocking the main thread. When an asynchronous operation is running, it can be handled separately while the rest of the application continues executing. If we do not use await inside an async flow, the function may return before the asynchronous logic has actually completed. The return value of an async function is also different from a normal synchronous function. From what I remember, without waiting for the Promise to resolve, we do not immediately receive the actual final return value. A Promise represents the state and eventual value returned by an asynchronous operation. Using await allows us to wait for that Promise to complete before continuing, so we can then perform different actions depending on the result, such as handling a successful result or another outcome.
