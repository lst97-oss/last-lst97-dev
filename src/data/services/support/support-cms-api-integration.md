# Can you help with CMS and API integration?

- **Topic:** Support Engagements
- **Source ID:** support-cms-api-integration
- **URL:** https://www.lst97.dev/services

This document describes the Go Support Plan offering: technical help for a website or application that already exists. It covers the CMS / API Integration engagement. It does not cover the Website Packages offering, which builds a new website from scratch; a headless CMS configured as part of a new build is part of the Business package rather than this engagement.

CMS / API Integration is part of the standard A$100 engagement when it connects one existing service. This covers integration and troubleshooting for existing applications.

Examples include:

- Payload CMS
- Sanity
- Contentful
- Strapi
- Supabase
- REST APIs
- external SaaS APIs
- email providers
- analytics services

Content management integration is more involved than adding a static page because a CMS introduces a running system with its own environment, its own deployment behaviour, and content that has to be authored in an editor rather than written in the repository. A CMS that works locally and fails to build in production is a common version of this problem, and the cause is usually environment configuration rather than the CMS itself.

Email providers and analytics services fall into the same tier because the difficulty is almost always in the configuration rather than the integration: the required environment variables, the callback URLs, the permitted origins, and the consent or privacy settings that apply to visitor tracking.

This tier starts higher than deployment or bug fixes because integration work requires understanding an application's existing structure before adding to it, and because a correct integration needs to be verified against the real service rather than a stub.