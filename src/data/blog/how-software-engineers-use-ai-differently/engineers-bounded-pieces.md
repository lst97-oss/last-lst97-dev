# Do Not Ask AI to Solve the Entire System at Once
- **Category:** AI Workflows
- **Source ID:** engineers-bounded-pieces
- **URL:** https://www.lst97.dev/blog/how-software-engineers-use-ai-differently

## Do Not Ask AI to Solve the Entire System at Once

One of the most important skills when using coding agents is controlling scope.

Instead of:

> Build authentication, bookings, payments, email reminders and the dashboard.

I would rather work through bounded pieces.

For example:

1. Define the booking domain.
2. Design the persistence model.
3. Review constraints and indexes.
4. Implement the booking service.
5. Add validation.
6. Add authentication boundaries.
7. Expose the API.
8. Add the UI.
9. Add tests around important behaviour.
10. Integrate notifications.
11. Test the workflow end to end.

The exact order depends on the product.

I also would not say that every application should always be database-first. Some products benefit from starting with user flows, APIs or domain modelling.

The important point is **deliberate decomposition**.

AI performs much better when the engineer converts one huge ambiguous problem into a sequence of bounded problems.

That was an important software engineering skill before AI.

AI has made it even more important.
