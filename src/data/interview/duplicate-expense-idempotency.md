# How would you prevent the same expense request from being recorded twice if a user clicks submit twice or the network retries?

- **Category:** Applied Project Questions
- **Source ID:** duplicate-expense-idempotency
- **URL:** https://www.lst97.dev/chat

I would handle this primarily on the server using an idempotency key. When the client starts creating an expense, it generates a unique request ID and sends that ID with the request. The server stores the ID together with the created expense. If the user double-clicks the submit button or the network retries the same request, the server receives the same idempotency key. Instead of creating another expense, it recognises that the request has already been processed and returns the existing result. I would also enforce this at the database level with a unique constraint on the idempotency key. That protects against race conditions where two identical requests reach the server almost simultaneously. On the frontend, I would disable the submit button while the mutation is pending to improve the user experience, but I would not rely on that for correctness because duplicate requests can still occur because of network retries or other client behaviour. Libraries such as TanStack Query can help manage mutation state and retries, but duplicate protection should ultimately be guaranteed by the API and database.
