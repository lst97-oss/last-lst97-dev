# AI Changed Debugging
- **Category:** AI Workflows
- **Source ID:** engineers-ai-debugging
- **URL:** https://www.lst97.dev/blog/how-software-engineers-use-ai-differently

## AI Changed Debugging

Debugging is one of the areas where AI has changed my workflow the most.

Previously I would:

- reproduce the issue
- add breakpoints
- inspect variables
- read logs
- follow the call path
- narrow down the failure

That still matters.

But AI can investigate much faster.

Modern coding agents can sometimes use headless browsers, inspect DOM state, execute workflows and analyse application output themselves.

For UI and integration problems, I can describe what I suspect:

> I think this state is being overwritten after the request completes.

The agent can inspect the related code paths and either confirm or reject my hypothesis.

That reduces investigation time dramatically.

The important part is that I still need to evaluate whether the fix makes sense.

Fast debugging is not useful if the fix simply moves the bug somewhere else.
