# How the CMS, the two databases and the indexing jobs stay consistent with each other

- **Category:** Content Architecture
- **Source ID:** last-os-cms-and-content
- **URL:** https://www.lst97.dev/projects/last-os
- **Visibility:** Public

Content is structured rather than hard-coded. Projects and articles live in Payload as documents with a title, slug, summary, cover image, rich content, gallery, technologies, topics, tags, role, project status, start and end dates, repository and live URLs, publication status and SEO metadata. That is what allows one CMS to hold a short demo entry and a full engineering case study while the frontend stays generic — the same renderer serves both because neither shape is special-cased in code.

The schema separation is what makes that work: `slug`, `summary`, `role`, `projectStatus`, `featured` and `sortOrder` are real columns with their own constraints and indexes, while topics and tags are vocabulary collections joined by relationship. The home page reads `featured` projects ordered by `sortOrder`, so ordering is data rather than a query written per surface.

Publishing has explicit draft and published states, and access control is asymmetric in a useful way: unauthenticated requests can only read published content, while authenticated CMS users can read drafts. That keeps editorial state and public presentation separate without needing two collections or a staging copy.

**Two databases, by design.** `DATABASE_URL` holds ordinary application and CMS data — posts, projects, changelogs, media metadata, users, rate-limit windows and contact approval state. `KNOWLEDGE_DATABASE_URL` is a separate database dedicated to retrieval and historical analytics: embeddings, the vector index, GitHub knowledge, the WakaTime warehouse, and the knowledge project catalogue. `knowledge:migrate` only ever touches the second one.

The workloads genuinely differ. The CMS is a CRUD surface with relationships, authentication, publication and editorial workflow; the knowledge side holds vectors, similarity search, embedding metadata, and a large imported dataset — over a million heartbeats in the WakaTime case. Combining them would work technically, so the reason to separate is operational rather than technical: the retrieval subsystem can be rebuilt, reindexed or scaled without touching the editorial database, and a runaway analytics query cannot lock the tables the admin is writing to. A deployment mistake in one database's migrations cannot take out the other.

The consequence worth noting is that this also means there is no implicit join between CMS content and its knowledge rows. Anything that needs both has to carry the identity across deliberately, which is why source identity is `type:sourceId` and never a chunk id — so re-chunking a document replaces its chunks without touching anything else.

**Indexing follows the CMS rather than being maintained by hand.** Posts and projects carry hooks, so publishing content enqueues an `indexKnowledgeSource` job through Payload's own job system. The job accepts the document, chunks it, generates embeddings and writes them to the knowledge database; deleting content triggers the corresponding cleanup. A scheduled knowledge-sync job keeps sources aligned over time without anyone remembering to re-run an importer.

Because chunk deduplication is by source identity, a repeated indexing run replaces that document's chunks and leaves every other source untouched. That is what makes the job safe to retry — and it is retried, with exponential backoff, because a transient embedding failure should not permanently drop a source.

Migrations follow the same discipline on the schema side. Payload runs with automatic pushes disabled and applies committed migrations explicitly, so a schema change is a reviewable file rather than whatever happened to be in the database. Development runs a migration check before starting, so a collection field that was added without a migration fails immediately instead of quietly becoming local-only state that breaks on deploy.

Rich text is authored as Markdown and converted with the same converter the admin's Markdown mode uses. That matters for more than convenience: it means a fenced `mermaid` block becomes a Lexical code block tagged with that language, which is exactly what the shared renderer keys on to draw a flowchart instead of printing diagram source as a paragraph. Keeping one conversion path is what keeps that behaviour identical between a seeded project and one an author writes in the admin.