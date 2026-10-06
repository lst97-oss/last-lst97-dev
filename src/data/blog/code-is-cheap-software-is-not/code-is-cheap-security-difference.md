# Security Is Where the Difference Becomes More Serious
- **Category:** AI-Assisted Development
- **Source ID:** code-is-cheap-security-difference
- **URL:** https://www.lst97.dev/blog/code-is-cheap-software-is-not

## Security Is Where the Difference Becomes More Serious

Security is one of the areas where inexperienced vibe coding can become dangerous.

Authentication is a good example.

A developer will generally prefer a mature, widely reviewed authentication system rather than inventing a custom authentication mechanism without a strong reason.

We think about questions such as:

- Which endpoints require authentication?
- Which endpoints require authorisation?
- Are permissions checked server-side?
- How are sessions handled?
- How are passwords or tokens stored?
- What input needs validation?
- What data should never reach the client?
- Are secrets exposed?
- What happens when the user changes roles?

Many of these protections are invisible when everything works normally.

That makes them easy to miss when your only success criterion is:

> The feature works.

The same applies to payments, customer data, migrations, backups and infrastructure.

The more valuable the system becomes, the more expensive these invisible mistakes become.
