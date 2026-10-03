# How are migrations and major changes priced?

- **Topic:** Custom-Quoted Work
- **Source ID:** support-migration-major-changes
- **URL:** https://www.lst97.dev/services

This document describes the Go Support Plan offering: technical help for a website or application that already exists. It covers migration and major-change work, which has no starting price. It does not cover the Website Packages offering, which builds a new website from scratch: choosing a stack for a new build is part of the package, whereas migrating an existing system away from what it already uses is quoted individually.

Some projects require more than a simple deployment fix. These are quoted individually after the existing system has been reviewed.

Examples include:

- hosting migration
- framework migration
- database migration
- major dependency upgrades
- authentication redesign
- significant code refactoring
- Dockerisation
- CI/CD restructuring
- infrastructure redesign

No starting price applies because the work is defined by what the existing system actually contains. A framework migration from one well-structured application to another is a different exercise from migrating an application whose structure has drifted, and quoting either before inspection would be guesswork.

Dockerisation and CI/CD restructuring are listed here rather than as standard deployment because both change how the application is built and run, not merely where it is hosted. Once a container definition and a pipeline exist, they affect every subsequent change.

Authentication redesign sits in this tier because changing how identity works touches every route, every protected request, and every stored session. It is rarely a bounded task even when the eventual change looks small from the outside.

Consultation is the normal entry point for this tier, and its cost may be credited toward the implementation where the engagement proceeds.