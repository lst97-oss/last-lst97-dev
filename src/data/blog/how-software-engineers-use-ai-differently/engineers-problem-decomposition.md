# The Difference Starts With Problem Decomposition
- **Category:** AI Workflows
- **Source ID:** engineers-problem-decomposition
- **URL:** https://www.lst97.dev/blog/how-software-engineers-use-ai-differently

## The Difference Starts With Problem Decomposition

Consider two people building the same booking system.

A non-developer might start with:

> Build me a booking system.

An engineer is more likely to decompose the problem.

The conversation might start closer to:

> I am building a booking system for this type of business. It needs reservations, availability, time-slot selection, cancellations and staff management. Let's define the domain and data model first.

Then we review the proposed design.

What entities exist?

Perhaps:

- User
- Customer
- StaffMember
- Service
- Location
- AvailabilityRule
- Booking
- BookingStatus
- Payment

Then we ask more questions.

Can two services have different durations?

Can one employee provide multiple services?

Can multiple employees share a resource?

Can bookings overlap?

What timezone is authoritative?

What happens when availability changes after a booking already exists?

That discussion shapes the database and domain model.

Only after those decisions are reasonably stable should implementation expand.
