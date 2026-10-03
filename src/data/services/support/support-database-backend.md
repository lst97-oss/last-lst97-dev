# Can you help with database and backend issues?

- **Topic:** Support Engagements
- **Source ID:** support-database-backend
- **URL:** https://www.lst97.dev/services

This document describes the Go Support Plan offering: technical help for a website or application that already exists. It covers the Database / Backend Support engagement. It does not cover the Website Packages offering, which builds a new website from scratch; database work requested as part of a new build is handled inside that build rather than as a support engagement.

Database / Backend Support is part of the standard A$100 engagement for smaller configuration or repair tasks. Major migrations and architecture changes are quoted separately.

Examples include:

- PostgreSQL configuration
- Supabase integration
- database connection issues
- environment setup
- basic schema changes
- simple migration problems
- API configuration

Major database migrations, architecture changes, or production data migrations require a separate quote.

This tier is bounded by size rather than by difficulty. A connection string that points at the wrong host, a schema change that needs a migration file, or an API route missing its environment configuration are all contained tasks. Migrating a production database with live data is not, because it requires a rehearsed procedure and a rollback plan rather than a change that can be reverted by editing a file.

Database connection issues are the most common request in this tier and are usually environmental. A hosted PostgreSQL endpoint reached over TLS with a self-signed certificate fails in two distinct ways depending on how the connection is configured, and the error message alone does not make the cause obvious.

Basic schema changes are included where they are additive and do not rewrite existing data. Anything that transforms or discards production rows belongs in the migration tier instead.