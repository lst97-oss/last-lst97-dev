export interface ChatPromptExample {
  /** The corpus or source the prompt exercises; shown as the chip's small tag. */
  source: string
  prompt: string
}

export interface ChatPromptGroup {
  id: string
  label: string
  prompts: readonly ChatPromptExample[]
}

/**
 * Example questions grouped by the corpus they exercise. Every prompt is a
 * phrase the real routing recognises (see
 * `src/server/moderation/decision/prompts.ts`) and is answerable from the
 * current index:
 *
 * - profile facts and goals → `search_knowledge` over the curated profile
 * - owned-project inventory → `list_owned_projects`
 * - mechanism questions → the project deep-dive documents
 * - opinions and essays → the blog corpus
 * - unframed software questions → the interview Q&A corpus
 * - coding time → `coding_stats` / `coding_history`
 * - publication state → `site_content`
 * - packages and the Go Support Plan → `services`
 *
 * Keep wording in the second person: chat scope reads "you/your" as Nelson, so
 * first-person examples would be answered as though the visitor asked about
 * himself. The one exception is the site-orientation question, which asks what
 * the visitor can do here.
 *
 * Lives in its own module, not beside the component: `only-export-components`
 * (a Fast-Refresh concern, `doctor.config.ts`) rejects data exports from a
 * component file, and the benchmark tests import the groups directly.
 */
export const CHAT_PROMPT_GROUPS: readonly ChatPromptGroup[] = [
  {
    id: 'about',
    label: 'ABOUT',
    prompts: [
      { source: 'PROFILE', prompt: 'What is your professional background and tech stack?' },
      { source: 'PROFILE', prompt: 'What did you study, and where have you worked?' },
      { source: 'PROFILE', prompt: 'What are your goals for the next year?' },
      { source: 'PROFILE', prompt: 'What are you working on right now?' },
    ],
  },
  {
    id: 'projects',
    label: 'PROJECTS',
    prompts: [
      { source: 'CATALOGUE', prompt: 'Show me all your projects.' },
      { source: 'CATALOGUE', prompt: 'How many projects do you have in total?' },
      { source: 'PROJECT DOC', prompt: 'How does the G-NAF address autocomplete route broad-prefix queries?' },
      { source: 'PROJECT DOC', prompt: 'What did you build for Wat Wat New Zealand?' },
    ],
  },
  {
    id: 'writing',
    label: 'WRITING',
    prompts: [
      { source: 'BLOG', prompt: 'Do you think code is cheap?' },
      { source: 'BLOG', prompt: "What's your take on vibe coding?" },
      { source: 'BLOG', prompt: 'You wrote that code is cheap — can you explain that idea?' },
      { source: 'BLOG', prompt: 'Have you written anything about AI and testing?' },
    ],
  },
  {
    id: 'technical',
    label: 'TECHNICAL',
    prompts: [
      {
        source: 'INTERVIEW',
        prompt: 'How do you make a deployment safe when the API and database release separately?',
      },
      { source: 'INTERVIEW', prompt: "What's the difference between Promise, async, and await?" },
      { source: 'INTERVIEW', prompt: 'How would you handle the remaining cents when splitting an expense?' },
      { source: 'INTERVIEW', prompt: 'How do you debug a production-only issue?' },
    ],
  },
  {
    id: 'coding',
    label: 'CODING',
    prompts: [
      { source: 'WAKATIME', prompt: 'How much have you coded this week?' },
      { source: 'WAKATIME', prompt: 'What was your longest coding streak this year?' },
      { source: 'WAKATIME', prompt: 'What is your all-time language breakdown?' },
      { source: 'WAKATIME', prompt: 'What are your all-time editor shares?' },
    ],
  },
  {
    id: 'site',
    label: 'SITE',
    prompts: [
      { source: 'SITE CONTENT', prompt: "What's your latest post?" },
      { source: 'SITE CONTENT', prompt: 'What is the latest changelog entry?' },
      { source: 'SITE CONTENT', prompt: 'What can I do on this site?' },
      { source: 'SITE RAG', prompt: 'How is this website built?' },
    ],
  },
  {
    id: 'services',
    label: 'SERVICES',
    prompts: [
      { source: 'OFFER', prompt: 'How much does a website cost?' },
      { source: 'OFFER', prompt: "What's included in the Business package?" },
      { source: 'OFFER', prompt: 'What is the Go Support Plan?' },
      { source: 'OFFER', prompt: 'Do you offer hourly support?' },
    ],
  },
] as const
