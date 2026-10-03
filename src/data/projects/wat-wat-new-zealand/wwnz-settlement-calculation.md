# How splits, balances, debt coverage and credit resolve into a settlement

- **Category:** Financial Logic
- **Source ID:** wwnz-settlement-calculation
- **URL:** https://www.lst97.dev/projects/wat-wat-new-zealand
- **Visibility:** Private

Wat Wat New Zealand turns transactions into money that actually moves in a defined sequence: transactions → member contributions → member liabilities → net balances → debtors and creditors → settlement suggestions, then back again as recorded settlements that reduce the underlying debt.

## Member splitting

A transaction applies to a set of beneficiaries and is divided among them. If Alice pays HKD 900 for herself, Bob and Carol, each person's individual share is HKD 300. Alice consumed HKD 300 but contributed HKD 900, so her net contribution toward the group is +HKD 600, while Bob and Carol each owe HKD 300. Aggregating those relationships across all relevant transactions gives member balances: a negative balance means the member owes, a positive balance means the member is owed.

## Balances become suggestions

Because reconstructing a position by hand from hundreds of individual expenses is not something a group should have to do, balances are converted into concrete payment relationships. The interface presents suggestions such as Bob paying Alice HKD 320.00.

## Settlements are separate from debts

A payment between members is itself recorded as a settlement transaction. Money owed and money actually paid are different facts, and recording them separately is what lets the system distinguish outstanding debt, historical debt, settled and unsettled totals, partial repayment, and credit already applied.

## Debt coverage and traceability

A settlement should trace back to the expense records it resolves. An HKD 820 obligation might originate from Hotel 400, Dinner 180, Transport 120 and Tickets 120. Rather than only recording "paid HKD 820", the settlement is associated with those underlying source records, which is what lets the application report which expenses remain outstanding after a partial payment.

## Selecting debt records

Choosing source records is non-trivial when a user pays only part of their balance. With candidate debts of 420, 300, 180, 150 and 90 and a payment of HKD 570, the system must find an appropriate subset while considering record count, over-coverage, direct versus indirect records, and available credits.

For smaller candidate sets it runs an exact combinational search, prioritising:

1. Fewer records
2. Lower over-coverage
3. Fewer indirect records
4. Deterministic tie-breaking

For larger sets, where exhaustive search becomes expensive, it switches to greedy selection plus local improvement, so combinatorial cost never grows without bound.

## Credit handling

A relationship is not always pure debt. If Bob owes Alice HKD 500 and Alice owes Bob HKD 120, the effective outstanding position is HKD 380. Credits are applied against debt before deciding how much actual payment is required, and the UI exposes the debt subtotal, automatically applied credit, previously applied credit, net amount and remaining balance after payment — so the settlement history is explainable rather than a single unexplained number.

## Why this logic is tested independently

Settlement logic gets deterministic tests that do not depend on the UI. A financial-calculation regression does not fail loudly; it silently produces the wrong amount of money, which is the one failure mode a group expense ledger cannot afford.