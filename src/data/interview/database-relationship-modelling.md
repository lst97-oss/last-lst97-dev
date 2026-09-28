# How would you model the following database relationships: users and households, expenses and household members, expense categories, and payments or settlements?

- **Category:** Fundamental Questions
- **Source ID:** database-relationship-modelling
- **URL:** https://www.lst97.dev/chat

Users and households: many-to-one, or one-to-one, depending on the system design.

Expenses and household members: one-to-many.

Expense categories: many categories to many transactions.

Payments or settlements: one settlement can have many people associated with it.
