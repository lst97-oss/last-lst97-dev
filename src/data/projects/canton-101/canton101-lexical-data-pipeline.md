# How public Cantonese dictionaries become one curated, repeatable lexicon

- **Category:** Data Pipeline
- **Source ID:** canton101-lexical-data-pipeline
- **URL:** https://www.lst97.dev/projects/canton-101
- **Visibility:** Private

Canto101 is built around a single content spine: a large, curated Cantonese lexical corpus. Everything a learner sees — a dictionary entry, a word highlighted in a lyric line, a vocabulary card, a sentence with per-word readings — is a different way of reading that same corpus. If the corpus is wrong, every surface is wrong in the same way, so building it deliberately rather than scraping at request time is the difference between a product and a demo.

The pipeline takes public Cantonese dictionary sources, normalises them, enriches them, merges them across sources, classifies them, and emits a versioned seed snapshot that every environment consumes.

## Normalised source files

The first stage is normalisation, and it exists because public dictionary sources disagree about almost everything. They disagree about the shape of a record: some carry one reading per entry, some carry several. They disagree about fields — some have definitions, some have usage notes, some have Cantonese-specific metadata that other sources lack entirely. They disagree about encoding, about traditional versus simplified characters, and about which variant of a character is canonical.

Normalisation turns each source into a common record shape before anything else looks at it. A source that cannot be normalised is skipped rather than allowed to propagate malformed records through the entire pipeline. That is a deliberate choice: a bad row from one source that reached the merge step would be indistinguishable from a real entry afterwards, and would be much harder to trace.

## Enrichment

Normalised records are then enriched. This is where the entries gain the fields a learner needs and a raw dictionary does not provide: romanisation beyond a single system, part of speech for each sense, and the multiple readings that characterise Cantonese.

Multiple readings are the significant one. A Cantonese word can have more than one standard reading, and a dictionary that stores one loses a real fact. Jyutping is the primary system, with Yale and IPA alongside it, and every valid reading is kept rather than collapsed to a first-match. This is what makes the entry correct for a speaker whose dictionary disagrees with the app.

Enrichment is the expensive stage, so it runs on the normalised set rather than per request. A lookup never calls a model, never waits on an enrichment service, and never produces a different answer for the same word than the last time it was asked.

## The merged multi-source lexicon

The enriched records are merged across sources into one lexicon. This is where the value of having several sources becomes real: a word present in only one dictionary gains senses and readings from the others, and where sources disagree the merge keeps both readings and both senses rather than picking a winner.

Curated scenario tags are added in the same pass. These are the links from a dictionary entry to the situations a learner actually meets it in — a themed sentence, a lyric line, a talk segment — and they are what turns a word list into something a learner can practise. The tag is part of the corpus, not a query-time join, so the corpus is the thing that is curated.

## Difficulty, register and script variants

A classification pass adds difficulty, register labels, and script-variant forms. Difficulty is what lets a learner filter a search down to what they can handle; register is what warns them that a word is formal, slang or dated. Script-variant forms mean an entry is findable by the variant of a character the learner happens to be typing.

Both are properties of the entry rather than of the search, so filtering by them is an indexed lookup instead of a computation over the corpus.

## A versioned seed snapshot

The output is a versioned seed snapshot, not a pile of ad-hoc imports. This is the decision that makes the content reproducible.

Seeding is repeatable: running it again produces the same database from the same snapshot. Reruns are idempotent, so a snapshot can be applied to a fresh environment or an existing one with the same result and no duplicate rows. And a snapshot can be published, so every environment — local, staging, production — is seeded from one place rather than each accumulating whatever imports happened to be run against it.

The value shows up when the corpus needs a correction. Fixing an entry means fixing it in the pipeline, regenerating the snapshot and reseeding — a reviewable change. Editing the production database directly would fix the symptom and leave every other environment wrong.

## From snapshot to query

The snapshot is seeded into PostgreSQL, where it is indexed for both search and rich lookup queries. Search is full-text over the corpus for the find-a-word path, and rich lookup is the direct entry read for the dictionary page, the lyric line and the sentence view. The seeded database is the read path for every surface, which is why the pipeline's output shape — rather than any single source dictionary — is what the product actually depends on.