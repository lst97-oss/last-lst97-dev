# What HTTP status codes would you use for a successful request, invalid input, authentication failure, authorization failure, resource not found, and server failure?

- **Category:** Fundamental Questions
- **Source ID:** http-status-codes
- **URL:** https://www.lst97.dev/chat

Successful request: 200, or generally a status code within the 2xx range.

Invalid input: 403.

Authentication failure: 401.

Authorization failure: 401.

Resource not found: 404.

Server failure: 500 or 501, or generally a status code starting with 5xx.
