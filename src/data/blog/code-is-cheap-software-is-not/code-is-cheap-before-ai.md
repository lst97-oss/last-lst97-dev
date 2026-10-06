# Software Development Before AI
- **Category:** AI-Assisted Development
- **Source ID:** code-is-cheap-before-ai
- **URL:** https://www.lst97.dev/blog/code-is-cheap-software-is-not

### Why hire a software developer when AI can build your website?

A few years ago, building software required a significant amount of manual work.

Developers searched GitHub for examples, read API documentation, looked through Stack Overflow posts, debugged applications line by line, configured servers manually, wrote deployment scripts, and spent hours understanding why two package versions refused to work together.

Today, an AI coding agent can perform a surprising amount of that work.

It can generate components, implement APIs, write database queries, create tests, inspect browser output, read documentation, review pull requests, analyse logs, and even help diagnose deployment failures.

So there is an obvious question:

> If AI can build software, why should a business still hire a software developer?

My answer is simple:

> **Code is cheap. Software is not.**

AI has dramatically reduced the cost of producing code.

It has not removed the need to engineer reliable software.


### Software Development Before AI

Before modern coding agents, implementing even a relatively small feature could involve a long chain of manual research.

If I wanted to integrate a new library, I might:

1. Read its documentation.
2. Search GitHub for examples.
3. Find Stack Overflow discussions about common problems.
4. Discover that some of those answers were already outdated.
5. Compare package versions.
6. Experiment with different implementations.
7. Debug failures.
8. Finally write the production implementation.

Debugging itself was often slow.

You might place breakpoints throughout the application, inspect variables one by one, trace execution paths and gradually narrow the problem down until you found the real cause.

Deployment was another discipline entirely.

Creating a Dockerfile or Docker Compose configuration meant understanding things such as:

- Linux permissions
- filesystem layout
- environment variables
- container networking
- ports
- build stages
- runtime selection
- persistent storage
- reverse proxies

Once deployed, debugging might mean SSHing into the server, checking logs manually and trying to reproduce the issue.

For someone still learning full-stack development, deployment alone could consume an entire day.

Testing also had a very real opportunity cost.

On small personal projects, developers sometimes skipped extensive automated testing because manually creating and maintaining those tests could take almost as long as implementing the feature itself.

Shipping the feature often won.
