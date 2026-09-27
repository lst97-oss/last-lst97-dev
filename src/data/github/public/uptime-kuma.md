# uptime-kuma

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/uptime-kuma.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; implements authentication; uses a distributed or explicit cache.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Persists or queries application data
- Technology: TypeScript, Vite, PostgreSQL, JavaScript, Python, Go, Java, C#
- Software kinds: web_app, infrastructure_devops
- Curated topics: monitoring, uptime

## Repository metadata
- **Repository:** lst97/uptime-kuma
- **Visibility:** public
- **URL:** https://github.com/lst97/uptime-kuma
- **Default branch:** master
- **Created:** 2025-04-09T16:15:18Z
- **Last updated:** 2025-05-29T13:30:35Z
- **Primary language:** JavaScript
- **License:** MIT License
- **Homepage:** https://uptime.kuma.pet
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `web_app`, `infrastructure_devops`
- **Curated topics:** `monitoring`, `uptime`

### GitHub language breakdown
- JavaScript (937,920 bytes)
- Vue (715,615 bytes)
- TypeScript (22,884 bytes)
- SCSS (15,559 bytes)
- Dockerfile (4,408 bytes)
- Go (2,699 bytes)
- Shell (2,058 bytes)
- HTML (1,102 bytes)
- Java (908 bytes)
- C# (557 bytes)
- PowerShell (387 bytes)
- PHP (322 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; implements authentication; uses a distributed or explicit cache.
Evidence: `server/check-version.js`, `server/client.js`, `server/config.js`, `server/modules/apicache/apicache.js`, `server/monitor-types/real-browser-monitor-type.js`, `server/notification-providers/46elks.js`, `server/notification-providers/alerta.js`, `server/notification-providers/alertnow.js`, `server/notification-providers/bark.js`, `server/model/group.js`, `server/model/status_page.js`, `server/monitor-types/smtp.js` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `server/check-version.js`, `server/client.js`, `server/config.js`, `server/modules/apicache/apicache.js`, `server/monitor-types/real-browser-monitor-type.js` (**inferred**)
- Calls external HTTP services — Evidence: `server/check-version.js`, `server/notification-providers/46elks.js`, `server/notification-providers/alerta.js`, `server/notification-providers/alertnow.js`, `server/notification-providers/bark.js` (**inferred**)
- Persists or queries application data — Evidence: `server/client.js`, `server/model/group.js`, `server/model/status_page.js` (**inferred**)
- Implements authentication — Evidence: `server/monitor-types/real-browser-monitor-type.js` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `server/modules/apicache/apicache.js` (**inferred**)
- Sends email through an email transport — Evidence: `server/monitor-types/smtp.js` (**inferred**)
- Implements command-line behavior — Evidence: `server/config.js` (**inferred**)
- Defines HTTP request handlers — Evidence: `server/modules/apicache/apicache.js` (**inferred**)
- Defines the Two FA type or service — Evidence: `server/2fa.js` (**inferred**)
- Defines the Docker Host type or service — Evidence: `server/docker.js` (**inferred**)
- Defines the Embedded Maria DB type or service — Evidence: `server/embedded-mariadb.js` (**inferred**)
- Defines the API Key type or service — Evidence: `server/model/api_key.js` (**inferred**)
- Defines the Group type or service — Evidence: `server/model/group.js` (**inferred**)
- Defines the Heartbeat type or service — Evidence: `server/model/heartbeat.js` (**inferred**)
- Defines the Incident type or service — Evidence: `server/model/incident.js` (**inferred**)
- Defines the Maintenance type or service — Evidence: `server/model/maintenance.js` (**inferred**)
- Defines the Remote Browser type or service — Evidence: `server/model/remote_browser.js` (**inferred**)
- Provides the Status Page UI component — Evidence: `server/model/status_page.js` (**inferred**)
- Defines the Tag type or service — Evidence: `server/model/tag.js` (**inferred**)
- Defines the Condition Expression Group type or service — Evidence: `server/monitor-conditions/expression.js` (**inferred**)
- Defines the Condition Expression type or service — Evidence: `server/monitor-conditions/expression.js` (**inferred**)
- Defines the Condition Operator type or service — Evidence: `server/monitor-conditions/operators.js` (**inferred**)
- Defines the String Equals Operator type or service — Evidence: `server/monitor-conditions/operators.js` (**inferred**)
- Defines the String Not Equals Operator type or service — Evidence: `server/monitor-conditions/operators.js` (**inferred**)

## Tracked files
- **596 tracked files** in total
- Source: 385; tests: 15; documentation: 11; configuration: 104; assets/other: 81

## Repository structure
- Inspected 87 source files from the cloned repository (bounded for safety).
- `.github/` (16 tracked files)
- `config/` (3 tracked files)
- `db/` (79 tracked files)
- `docker/` (6 tracked files)
- `extra/` (54 tracked files)
- `public/` (8 tracked files)
- `server/` (155 tracked files)
- `src/` (242 tracked files)
- `test/` (15 tracked files)
- `config/vite.config.js`
- `server/2fa.js`
- `server/check-version.js`
- `server/client.js`
- `server/config.js`
- `server/docker.js`
- `server/embedded-mariadb.js`
- `server/google-analytics.js`
- `server/image-data-uri.js`
- `server/jobs.js`
- `server/jobs/clear-old-data.js`
- `server/jobs/incremental-vacuum.js`
- `server/model/api_key.js`
- `server/model/docker_host.js`
- `server/model/group.js`
- `server/model/heartbeat.js`
- `server/model/incident.js`
- `server/model/maintenance.js`
- `server/model/remote_browser.js`
- `server/model/status_page.js`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `server/check-version.js`, `server/client.js`, `server/config.js`, `server/modules/apicache/apicache.js`, `server/monitor-types/real-browser-monitor-type.js` (**inferred**)
- Calls external HTTP services — Evidence: `server/check-version.js`, `server/notification-providers/46elks.js`, `server/notification-providers/alerta.js`, `server/notification-providers/alertnow.js`, `server/notification-providers/bark.js` (**inferred**)
- Persists or queries application data — Evidence: `server/client.js`, `server/model/group.js`, `server/model/status_page.js` (**inferred**)
- Implements authentication — Evidence: `server/monitor-types/real-browser-monitor-type.js` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `server/modules/apicache/apicache.js` (**inferred**)
- Sends email through an email transport — Evidence: `server/monitor-types/smtp.js` (**inferred**)
- Implements command-line behavior — Evidence: `server/config.js` (**inferred**)
- Defines HTTP request handlers — Evidence: `server/modules/apicache/apicache.js` (**inferred**)
- Defines the Two FA type or service — Evidence: `server/2fa.js` (**inferred**)
- Defines the Docker Host type or service — Evidence: `server/docker.js` (**inferred**)
- Defines the Embedded Maria DB type or service — Evidence: `server/embedded-mariadb.js` (**inferred**)
- Defines the API Key type or service — Evidence: `server/model/api_key.js` (**inferred**)
- Defines the Group type or service — Evidence: `server/model/group.js` (**inferred**)
- Defines the Heartbeat type or service — Evidence: `server/model/heartbeat.js` (**inferred**)
- Defines the Incident type or service — Evidence: `server/model/incident.js` (**inferred**)
- Defines the Maintenance type or service — Evidence: `server/model/maintenance.js` (**inferred**)
- Defines the Remote Browser type or service — Evidence: `server/model/remote_browser.js` (**inferred**)
- Provides the Status Page UI component — Evidence: `server/model/status_page.js` (**inferred**)
- Defines the Tag type or service — Evidence: `server/model/tag.js` (**inferred**)
- Defines the Condition Expression Group type or service — Evidence: `server/monitor-conditions/expression.js` (**inferred**)
- Defines the Condition Expression type or service — Evidence: `server/monitor-conditions/expression.js` (**inferred**)
- Defines the Condition Operator type or service — Evidence: `server/monitor-conditions/operators.js` (**inferred**)
- Defines the String Equals Operator type or service — Evidence: `server/monitor-conditions/operators.js` (**inferred**)
- Defines the String Not Equals Operator type or service — Evidence: `server/monitor-conditions/operators.js` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- Vite — Evidence: `package.json`
- PostgreSQL — Evidence: `package.json`
- JavaScript — Evidence: `.eslintrc.js`, `config/jest-backend.config.js`, `config/playwright.config.js`, `config/vite.config.js`, `db/knex_init_db.js`, `db/knex_migrations/2023-08-16-0000-create-uptime.js`, `db/knex_migrations/2023-08-18-0301-heartbeat.js`, `db/knex_migrations/2023-09-29-0000-heartbeat-retires.js`
- Python — Evidence: `extra/push-examples/python/index.py`
- Go — Evidence: `extra/healthcheck.go`, `extra/push-examples/go/index.go`, `extra/uptime-kuma-push/uptime-kuma-push.go`
- Java — Evidence: `extra/push-examples/java/index.java`
- C# — Evidence: `extra/push-examples/csharp/index.cs`
- PHP — Evidence: `extra/push-examples/php/index.php`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `test/backend-test/README.md`, `test/backend-test/monitor-conditions/test-evaluator.js`, `test/backend-test/monitor-conditions/test-expressions.js`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
