# How the SmartPlay crawler pipeline is structured

- **Category:** Data Collection
- **Source ID:** smartplay-crawler-pipeline
- **URL:** https://www.lst97.dev/projects/smartplay-hk-oss
- **Visibility:** Public

I built SmartPlay HK OSS around a separation of workloads: one side collects data from the LCSD SmartPLAY service, the other serves users from a local PostgreSQL representation optimised for search. The crawler exists because proxying the LCSD API from the browser was rejected for six concrete reasons. The application would depend directly on external availability, response times would depend on LCSD, every user could generate duplicate upstream requests for the same information, historical state would be unavailable, filtering large result sets would be harder, and an external outage would immediately become an application outage. Instead, the project continuously transforms an external source into a searchable local representation.

The pipeline runs in a fixed order. A `node-cron` scheduler fires on a schedule that is configurable through environment variables rather than hard-coded into the application. It creates a scheduled crawl, determines which dates and facilities need refreshing, and queues crawl tasks. A crawler orchestrator takes those tasks and drives them, and a `p-queue` places an explicit concurrency boundary around upstream requests so the crawler can work in parallel without creating uncontrolled bursts against SmartPLAY. Concurrency and request timing are both configurable, and I chose a conservative limited-concurrency model rather than assuming more parallelism automatically means better performance. The external service is a dependency I do not control, so protecting it is also part of protecting my own application. From there an HTTP client issues the request to LCSD SmartPLAY, the response is validated, then normalised, then written through a Prisma repository into PostgreSQL.

The scheduler maintains persisted crawl state, so a long multi-day refresh is tracked as individually identifiable crawl jobs rather than one opaque process. A scheduled run owns crawl jobs, and each job carries its own result and session records. This is what makes crawl history persistent and queryable instead of something that only exists in logs while a process happens to be running.

Because of this design, the web application can serve every user from its own database even though the underlying data originates from an external service.
