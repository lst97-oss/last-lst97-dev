# What is outside the scope of standard support?

- **Topic:** Support Scope
- **Source ID:** support-scope-notes
- **URL:** https://www.lst97.dev/services

This document describes the Go Support Plan offering: technical help for a website or application that already exists. It covers what a standard A$100 engagement deliberately excludes. It does not cover the Website Packages offering, where the work is the original build rather than a fix, and where these items would be scope questions for the quotation instead of support scope exclusions.

A standard support service assumes that the application is already generally functional.

The following are normally outside the standard scope:

- major code refactoring
- database redesign
- large framework migrations
- extensive dependency upgrades
- authentication redesign
- major security remediation
- infrastructure redesign
- significant data migration

If any of these are discovered during the review, the issue is explained and a separate quote is provided before proceeding with additional work.

This boundary exists to protect the fixed price rather than to limit what can be done. A standard deployment is priced on the assumption that the application works and only needs to be put online correctly. If that assumption turns out to be wrong, the work is no longer a deployment, and delivering it under the original price would mean either absorbing an unbounded cost or under-delivering on something that was never agreed.

The scope notes are written to be explicit so that the boundary is visible before an engagement begins rather than discovered during it. A client who knows a deployment will not include a framework migration can decide whether to fix the underlying issues first or to fund that work separately.

Security remediation is included on this list deliberately. A production readiness review will identify obvious security issues, but remediating a significant one is a development task with its own scope, and treating it as part of a deployment would misrepresent both.