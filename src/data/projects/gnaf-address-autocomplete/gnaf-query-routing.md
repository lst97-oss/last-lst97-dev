# How a typed query becomes a chosen PostgreSQL search strategy

- **Category:** Search Architecture
- **Source ID:** gnaf-query-routing
- **URL:** https://www.lst97.dev/projects/gnaf-address-autocomplete
- **Visibility:** Public

Every autocomplete request passes through a fixed pipeline: API key authentication, a query parser, the LRU cache, a query classifier, and then a search tier router that picks one concrete PostgreSQL strategy before anything touches the database. I deliberately did not funnel all traffic through a single generic full-text query, because the search representation is a materialized view carrying several specialised indexes and each one is fast for particular query shapes and slow for others.

The query parser performs input normalisation first — trimming, lowercasing, collapsing whitespace and stripping punctuation — so that `12 main st sydney` and `Main St. Sydney NSW` reach the classifier in a comparable form. The query classifier then inspects that normalised string and works out what the user appears to be searching for: a street prefix, a locality, a postcode, a state, or some combination. Its output is a structured intent that the search tier router maps to exactly one strategy:

| Query pattern | Search strategy |
| --- | --- |
| Street prefix | B-tree prefix index |
| State + locality | Composite B-tree index |
| State + postcode | Composite B-tree index |
| Postcode prefix | B-tree prefix index |
| Incomplete/fuzzy street | Trigram GIN |
| Multi-word fallback | Trigram search |
| Corrected typo | Correction then indexed prefix search |

So `3000` is answered from the B-tree prefix index over postcodes, `syd nsw` uses the composite B-tree index on state plus locality, `12 main st sydney` resolves through the street prefix index when the classifier can decompose it, and only a genuinely incomplete or misspelled street name falls through to the trigram GIN index.

Routing exists because autocomplete workloads are highly uneven. A request for `syd nsw` has entirely different characteristics from `12 main st sydney` or `3000`: different selectivity, different index behaviour, different result shapes. Treating all three identically wastes work — either it runs an expensive fuzzy scan for a query a B-tree prefix lookup would have answered, or it answers a typo with nothing because the index cannot help.

Typo correction is the clearest case for the tier router. The pipeline corrects common street, locality and state mistakes before the query reaches PostgreSQL, and then, where possible, routes the *corrected* input back into the fast indexed paths rather than sending every imperfect query to an expensive fuzzy search. That is what preserves both search quality and latency at the same time: the user still gets results for a mistyped street, but the query is answered by an index rather than by a trigram scan. Trigram GIN search remains the fallback for genuinely incomplete input where no correction can produce a matchable prefix.

The whole architecture exists because I chose PostgreSQL itself as the search engine instead of adding Elasticsearch, OpenSearch or Redis. Routing is what makes that decision viable: the multi-tier router concentrates each query shape onto the index built for it, so the required latency is achievable without a separate search cluster. The application also records request timing alongside search-tier information, which lets me see which strategies are actually being used and where latency is coming from.