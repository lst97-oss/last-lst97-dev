# Can you help with domain, DNS, and hosting setup?

- **Topic:** Support Engagements
- **Source ID:** support-domain-dns-hosting
- **URL:** https://www.lst97.dev/services

This document describes the Go Support Plan offering: technical help for a website or application that already exists. It covers the Domain / DNS / Hosting Setup engagement. It does not cover the Website Packages offering, which builds a new website from scratch; domain connection assistance for a new build is part of the package rather than a separately quoted engagement.

Domain / DNS / Hosting Setup is a standard A$100 engagement.

Support may include:

- custom domain connection
- Cloudflare DNS setup
- SSL configuration
- subdomains
- redirects
- email DNS records
- hosting configuration
- CDN configuration
- production environment setup

These tasks are grouped together because they are almost always the same underlying problem seen from different angles: the application is deployed, but the public domain does not yet serve it. Name resolution, TLS, and routing are three parts of one configuration, and separating them into separate engagements rarely helps.

SSL configuration is included because a domain that resolves over plain HTTP is not a finished configuration, regardless of whether the application itself is correct.

Email DNS records are included where a domain also carries transactional or forwarding mail. Those records live alongside the routing records and are frequently the cause of a deliverability problem that looks unrelated to deployment.

Hosting and CDN configuration depend on the platform chosen for the application, so the consultation stage usually establishes the target first. The work itself is bounded and is quoted as a fixed-price task.