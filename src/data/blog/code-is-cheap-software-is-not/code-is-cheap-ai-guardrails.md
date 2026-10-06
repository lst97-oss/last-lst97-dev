# AI Still Needs Guardrails
- **Category:** AI-Assisted Development
- **Source ID:** code-is-cheap-ai-guardrails
- **URL:** https://www.lst97.dev/blog/code-is-cheap-software-is-not

## AI Still Needs Guardrails

I also do not give AI unrestricted control over production systems.

My preference is to maintain separate environments such as:

- development
- pre-production or staging
- production

AI can operate much more freely in development and staging.

Production requires tighter controls.

Coding agents can make mistakes.

I have experienced cases where Git operations around conflicts caused untracked work to disappear. Experiences like that make me much more conservative around repository operations, deployment and production infrastructure.

Secrets are another important boundary.

An AI agent should not automatically receive unrestricted access to `.env` files or production credentials.

When AI-assisted operations are required, I prefer concepts such as:

- least-privilege access
- restricted credentials
- temporary credentials where possible
- read-only log access
- staging before production
- reviewed deployment changes

AI can make DevOps dramatically more efficient.

That does not mean giving an autonomous agent unrestricted root access to your infrastructure is a good engineering practice.
