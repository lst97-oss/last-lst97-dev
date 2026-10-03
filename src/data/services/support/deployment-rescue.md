# What is deployment rescue?

- **Topic:** Support Engagements
- **Source ID:** deployment-rescue
- **URL:** https://www.lst97.dev/services

This document describes the Go Support Plan offering: technical help for a website or application that already exists. It covers deployment rescue, the case where a project works locally but fails in production. It does not cover the Website Packages offering, which builds a new website from scratch; a build that has never been deployed is a new-build concern rather than a rescue.

Deployment rescue is part of the standard A$100 engagement. It applies when a project works locally but fails in production, and the cause needs investigating.

Typical issues include:

- failed production builds
- incorrect build commands
- missing environment variables
- dependency conflicts
- Node.js or runtime compatibility issues
- incorrect production URLs
- API configuration errors
- database connection failures
- authentication callback problems
- production-only errors

Complex issues may require additional development work.

The distinction from standard deployment is the starting position. Standard deployment takes an application that is working and puts it online. Deployment rescue takes an application that was already online-intended and did not arrive, so the first task is establishing why the difference between the local environment and the production environment matters. Frequently the answer is a single missing variable or a build command that differs between the two.

Production-only errors are the usual signal that something in the local environment is carrying state that production does not have: a development database URL, a permissive cookie setting, a locally cached dependency, or an authentication provider configured only for localhost.

Because the investigation is scoped to a specific failure, this is normally a fixed-price engagement. If the cause turns out to be a structural problem rather than a configuration one, that is identified before any further work is agreed.