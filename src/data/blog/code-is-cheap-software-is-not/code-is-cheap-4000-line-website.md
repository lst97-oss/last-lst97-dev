# The 4,000-Line Website Problem
- **Category:** AI-Assisted Development
- **Source ID:** code-is-cheap-4000-line-website
- **URL:** https://www.lst97.dev/blog/code-is-cheap-software-is-not

## The 4,000-Line Website Problem

One pattern I frequently see with AI-generated projects is that the application technically works, but its structure becomes increasingly difficult to maintain.

A prompt such as:

> Build my business website.

can result in one enormous HTML, CSS or JavaScript implementation containing thousands of lines.

For a small demonstration, that may be perfectly acceptable.

But then the owner asks for:

- authentication
- bookings
- payments
- an administration panel
- email notifications
- customer accounts
- analytics
- multiple roles

Now the original architectural decisions matter.

When responsibilities were never separated properly, every new feature introduces more coupling.

Two utility functions start solving the same problem differently.

Pages use slightly different colours.

Validation exists in one form but not another.

Business logic appears in both frontend and backend code.

Old scripts remain in the repository.

Unused dependencies accumulate.

Documentation stops matching the implementation.

The application still runs.

But changing it becomes progressively more expensive.

Eventually you reach the point where fixing two small problems requires refactoring a significant part of the system.

That is technical debt.

AI can generate technical debt much faster than humans ever could.
