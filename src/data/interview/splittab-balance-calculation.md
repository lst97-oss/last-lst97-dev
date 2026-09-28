# For SplitTab, how would you calculate each person’s balance after adding an expense?

- **Category:** Applied Project Questions
- **Source ID:** splittab-balance-calculation
- **URL:** https://www.lst97.dev/chat

By default, I would split the expense equally between all participants. For example, if the expense is $100 and there are two people, each person would be responsible for $50. SplitTab also supports custom percentage-based splits. For example, if Person A is assigned 70%, Person B would automatically receive the remaining 30%. For more than two participants, I designed a locking mechanism where the user can lock a percentage for particular people. The system then calculates the remaining percentage and distributes it equally among the unlocked participants, unless the user specifies their percentages manually. After determining each person's share, I would update their balance based on how much they paid compared with how much they actually owe. For example, if Person A paid the full $100 but only owes $50, their balance would show that they are owed $50 by the group.
