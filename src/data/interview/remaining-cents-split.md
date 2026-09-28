# An expense of $100 is split equally among three people. How would you handle the remaining cents?

- **Category:** Applied Project Questions
- **Source ID:** remaining-cents-split
- **URL:** https://www.lst97.dev/chat

I would always perform the calculation using integer cents rather than floating-point numbers. For example, $100 would be represented as 10,000 cents. Dividing that by three gives 3,333 cents each, with one cent remaining. That remaining cent needs to be assigned deterministically so that the total always adds back up to exactly $100. In SplitTab, since it is not intended to be a financial accounting system, I could assign the additional cent to the first participant based on a stable ordering. The final result would therefore be: Person A: $33.34, Person B: $33.33, Person C: $33.33. The important part is that the algorithm is deterministic and that the individual shares always add up exactly to the original expense.
