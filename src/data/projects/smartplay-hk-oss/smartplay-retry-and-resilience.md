# Failure classification, retries, the dead letter queue and the circuit breaker

- **Category:** Reliability
- **Source ID:** smartplay-retry-and-resilience
- **URL:** https://www.lst97.dev/projects/smartplay-hk-oss
- **Visibility:** Public

I added three layered defences in the SmartPlay crawler, in order, because retries alone are the wrong tool for a failing upstream.

The first layer is failure classification, applied before any retry decision is made. Timeouts, connection failures, HTTP 5xx and parse failures are all treated as retryable. HTTP 404 and other 4xx responses are usually permanent, because retrying a request the upstream has already rejected only adds load without changing the outcome. A failure is sorted first, and only then does the system decide whether another attempt makes sense. Retryable operations use exponential backoff rather than immediately repeating the same failed request, which reduces pressure on an already unhealthy upstream service.

The second layer is a database-backed dead letter queue for failures that outlive their retries. Each persisted entry records the facility, district, date, error type, HTTP status where available, attempt count, first failure time, latest failure time, next retry time, and the associated crawl job. The lifecycle is: a request fails, the error is classified, and a retryable failure goes to the DLQ, then through backoff to another retry, which either resolves the entry or re-queues or marks it permanent. A non-retryable failure is recorded as permanent straight away. Retries also include jitter, so multiple failed tasks do not all retry at the same instant. Because failures live in the database rather than only in application logs, the DLQ turns an operational question about what is failing into a query, and preserves visibility that log lines alone would lose.

The third layer is the circuit breaker, which moves through CLOSED, OPEN and HALF-OPEN. Retry logic is genuinely useful for isolated failures, but it becomes harmful when the entire upstream service is unavailable — if LCSD starts failing consistently, continuing to issue requests wastes application resources, creates unnecessary upstream load, lengthens queues, and generates large numbers of identical errors. When the failure threshold is reached, the crawler stops making upstream requests entirely. After a cooldown period a small number of requests are allowed through to test whether the service has recovered: success closes the circuit, failure reopens it. This prevents an upstream outage from turning into a cascading failure inside the crawler.
