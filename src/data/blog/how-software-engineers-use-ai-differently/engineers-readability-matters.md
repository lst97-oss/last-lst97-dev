# Readability Matters More When AI Writes the Code
- **Category:** AI Workflows
- **Source ID:** engineers-readability-matters
- **URL:** https://www.lst97.dev/blog/how-software-engineers-use-ai-differently

## Readability Matters More When AI Writes the Code

One interesting consequence of AI coding is that I care even more about project structure.

Why?

Because I may not personally type most of the implementation.

The codebase itself needs to communicate structure.

A well-organised project helps both humans and AI understand where behaviour belongs.

I prefer:

- feature-focused modules
- explicit responsibilities
- small components
- reusable shared abstractions
- predictable naming
- limited file size
- minimal duplication

I use file size as a warning signal rather than an absolute rule.

If a file approaches hundreds or thousands of lines, I ask whether it contains multiple responsibilities that should be separated.

This becomes especially important with agents, because AI is perfectly capable of continuing to add another 500 lines to an already oversized file if nobody tells it not to.
