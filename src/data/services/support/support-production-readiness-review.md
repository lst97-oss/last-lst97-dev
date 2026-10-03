# What is a production readiness review?

- **Topic:** Support Engagements
- **Source ID:** support-production-readiness-review
- **URL:** https://www.lst97.dev/services

This document describes the Go Support Plan offering: technical help for a website or application that already exists. It covers the Production Readiness Review. It does not cover the Website Packages offering, which builds a new website from scratch; testing before launch happens inside that build, and this review is for a project assembled elsewhere.

Production Readiness Review is included in the standard A$100 engagement. A production readiness review looks at a project before it is launched and reports what would stop it going live.

The review may include:

- build configuration
- environment variables
- production secrets
- obvious security issues
- database configuration
- authentication setup
- deployment architecture
- error handling
- SEO basics
- mobile responsiveness
- production configuration

After the review, recommendations are provided and, where appropriate, an implementation quote is issued.

The review is the lowest-cost way to find out whether a project is ready, and it is usually worth doing before a launch rather than after a failure. The findings are frequently configuration items — a secret committed to the repository, an environment variable missing from the deployment target, a cookie setting that will not survive production origins — that are cheap to correct and expensive to discover during an outage.

Mobile responsiveness is included because it is a launch blocker rather than a refinement: an application that cannot be used on a phone is not ready regardless of how it performs on a desktop.

The review produces recommendations rather than a pass or fail certificate. Some findings are advisory, some are launch blockers, and where a blocker requires development work it is quoted separately and explicitly approved before it begins.