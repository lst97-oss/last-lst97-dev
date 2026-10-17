import type { RelevanceBenchmarkCase } from './types'

/**
 * RAG relevance-gate cases: for each query/document pair, whether the document
 * directly supports the asked fact (`isRelevant`) and whether it contains
 * usable evidence (`containsEvidence`). Both probabilities must clear the
 * gate's 0.60 floor for a document to reach the prompt. The negative cases are
 * the ones that matter most: a keyword-only or broad-topic document must not
 * be promoted to evidence.
 */
export const relevanceBenchmarkCases: RelevanceBenchmarkCase[] = [
  {
    id: 'relevance-named-project-identity',
    query: 'What does the G-NAF Address Autocomplete project do?',
    document: {
      id: 'github:gnaf-address-autocomplete',
      title: 'G-NAF Address Autocomplete',
      sourceType: 'github',
      text: 'G-NAF Address Autocomplete is a geocoding service that resolves partial Australian addresses against the Geoscape G-NAF dataset. It ships a TypeScript client, a Node service, and a Postgres-backed index with fuzzy matching.',
    },
    expected: { isRelevant: true, containsEvidence: true },
  },
  {
    id: 'relevance-project-mechanism-doc',
    query: 'How does the G-NAF autocomplete pipeline rank candidate addresses?',
    document: {
      id: 'project-doc:gnaf-ranking.md',
      title: 'G-NAF Address Autocomplete — candidate ranking',
      sourceType: 'project-doc',
      text: 'Candidates are ranked with a hybrid score: trigram similarity over the canonical address string, a token overlap term, and a locality boost when the query context names a suburb. The top 20 candidates are re-ranked by the fallback path when the primary index returns nothing.',
    },
    expected: { isRelevant: true, containsEvidence: true },
  },
  {
    id: 'relevance-wrong-named-project',
    query: 'What does TPWFC do?',
    document: {
      id: 'github:smartplay-hk-oss',
      title: 'SmartPlay HK OSS — playground booking platform',
      sourceType: 'github',
      text: 'SmartPlay HK OSS is a booking platform for Hong Kong public playgrounds, with facility search, slot booking, and an admin console for venue operators.',
    },
    expected: { isRelevant: false, containsEvidence: false },
  },
  {
    id: 'relevance-profile-vs-services-doc',
    query: 'What is your professional experience and education?',
    document: {
      id: 'services:packages/website-builds.md',
      title: 'Website build packages and pricing',
      sourceType: 'services',
      text: 'Website builds start at A$1,000. The Starter package includes up to five pages, a contact form, and basic SEO. Revision rounds and third-party costs are listed separately.',
    },
    expected: { isRelevant: false, containsEvidence: false },
  },
  {
    id: 'relevance-price-question-vs-services-doc',
    query: 'How much does a website cost and what is included?',
    document: {
      id: 'services:packages/website-builds.md',
      title: 'Website build packages and pricing',
      sourceType: 'services',
      text: 'Website builds start at A$1,000. The Starter package includes up to five pages, a contact form, and basic SEO. Revision rounds and third-party costs are listed separately.',
    },
    expected: { isRelevant: true, containsEvidence: true },
  },
  {
    id: 'relevance-price-question-vs-project-doc',
    query: 'How much does a website cost and what is included?',
    document: {
      id: 'project-doc:gnaf-index.md',
      title: 'G-NAF Address Autocomplete — index design',
      sourceType: 'project-doc',
      text: 'The index stores normalized address tokens in a Postgres table with a GIN index; the service keeps a warm connection pool and caches the top localities.',
    },
    expected: { isRelevant: false, containsEvidence: false },
  },
  {
    id: 'relevance-private-project-detail',
    query: 'What is the Wat Wat New Zealand project about?',
    document: {
      id: 'github-private:wat-wat-new-zealand',
      title: 'Wat Wat New Zealand (private)',
      sourceType: 'github-private',
      text: 'Wat Wat New Zealand is a private tour-planning application. The sanitized summary describes a Next.js frontend, a booking API, and itineraries generated from operator schedules.',
    },
    expected: { isRelevant: true, containsEvidence: true },
  },
  {
    id: 'relevance-approach-question-vs-interview',
    query: 'How do you approach testing in your projects?',
    document: {
      id: 'interview:testing-approach',
      title: 'Interview — testing approach',
      sourceType: 'interview',
      text: 'My approach is to test at the seams: injected dependencies with fakes for the domain layer, and a small number of integration tests for the database and HTTP boundaries. I avoid mocking modules and prefer ports I can pass in.',
    },
    expected: { isRelevant: true, containsEvidence: true },
  },
  {
    id: 'relevance-equity-question-vs-interview',
    query: 'How do you approach testing in your projects?',
    document: {
      id: 'interview:equity-options',
      title: 'Interview — equity and options',
      sourceType: 'interview',
      text: 'When evaluating an offer I weigh base salary against equity, runway, and the team I would work with most days.',
    },
    expected: { isRelevant: false, containsEvidence: false },
  },
  {
    id: 'relevance-broad-topic-only',
    query: 'What was the measured performance of the SmartPlay booking search?',
    document: {
      id: 'github:smartplay-hk-oss-readme',
      title: 'SmartPlay HK OSS',
      sourceType: 'github',
      text: 'SmartPlay HK OSS uses Postgres for storage. Postgres is a widely used relational database management system with strong support for extensions and full-text search.',
    },
    expected: { isRelevant: false, containsEvidence: false },
  },
  {
    id: 'relevance-education-question-vs-random-repo',
    query: 'Where did you study and what qualifications do you hold?',
    document: {
      id: 'github:dotfiles',
      title: 'dotfiles',
      sourceType: 'github',
      text: 'Personal shell, editor, and tooling configuration for macOS, including a Neovim setup and a tmux status line.',
    },
    expected: { isRelevant: false, containsEvidence: false },
  },
  {
    id: 'relevance-site-implementation',
    query: 'How is the chat on this website built?',
    document: {
      id: 'project-doc:portfolio-chat.md',
      title: 'Portfolio chat architecture',
      sourceType: 'project-doc',
      text: 'The chat validates requests, screens them with a decision model, routes approved sources through read-only tools, and streams the answer as Server-Sent Events. Retrieval is gated per document before evidence reaches the responder.',
    },
    expected: { isRelevant: true, containsEvidence: true },
  },
]
