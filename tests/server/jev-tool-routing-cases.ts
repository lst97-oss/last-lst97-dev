import type { AgentToolName } from '../../src/server/chat/tools/agent-tools'
import type { ChatMessage, ChatTopicAnchor } from '../../src/server/chat/types'

export interface JevToolRoutingCase {
  id: string
  category: 'positive' | 'negative' | 'context'
  message: string
  expected: AgentToolName[]
  history?: ChatMessage[]
  topicAnchors?: ChatTopicAnchor[]
  evidence?: string
  toolOutputs?: string
}

/**
 * Human-reviewed baseline for Jev tool routing. Keep examples varied and
 * source-oriented; these are not intended as phrase-matching rules.
 */
export const jevToolRoutingCases: JevToolRoutingCase[] = [
  // search_knowledge: positive and near-boundary examples
  {
    id: 'knowledge-profile',
    category: 'positive',
    message: 'What did I study, and where have I worked?',
    expected: ['search_knowledge'],
  },
  {
    id: 'knowledge-you',
    category: 'positive',
    message: 'What is your professional experience and what skills do you have?',
    expected: ['search_knowledge'],
  },
  {
    id: 'knowledge-contributions',
    category: 'positive',
    message: 'Which repositories have you contributed to?',
    expected: ['search_knowledge'],
  },
  {
    id: 'knowledge-unknown-project',
    category: 'positive',
    message: 'What does TPWFC do?',
    expected: ['search_knowledge'],
  },
  {
    id: 'knowledge-owner-project-demos',
    category: 'positive',
    message: 'Do you have some live demo about your project?',
    expected: ['search_knowledge'],
  },
  {
    id: 'knowledge-project-demo-and-publication',
    category: 'positive',
    message: 'What demo URL do you have for GNAF Autocomplete, and is it published on your portfolio?',
    expected: ['search_knowledge', 'site_content'],
  },
  {
    id: 'knowledge-current-project',
    category: 'positive',
    message: 'What project are you currently working on?',
    expected: ['coding_history', 'search_knowledge'],
  },
  {
    id: 'knowledge-current-project-today',
    category: 'positive',
    message: 'What project are you working on today?',
    expected: ['coding_history', 'search_knowledge'],
  },
  {
    id: 'knowledge-typo-project',
    category: 'positive',
    message: 'Can you explain the project called TPFWC?',
    expected: ['search_knowledge'],
  },
  {
    id: 'knowledge-combined-facts',
    category: 'positive',
    message: 'Tell me about your education, work history, and coding skills.',
    expected: ['search_knowledge'],
  },
  {
    id: 'knowledge-currently-building',
    category: 'positive',
    message: 'What are you working on right now?',
    expected: ['coding_history', 'search_knowledge'],
  },
  {
    id: 'knowledge-repos-owned',
    category: 'positive',
    message: 'Which of your repositories do you own versus contribute to?',
    expected: ['search_knowledge'],
  },
  {
    id: 'projects-next-batch',
    category: 'positive',
    message: 'Show me more',
    expected: ['list_owned_projects'],
    history: [{ role: 'assistant', content: 'Here are some recent projects: GNAF Autocomplete, TicketQueue.' }],
  },
  {
    id: 'projects-all-owned-inventory',
    category: 'positive',
    message: 'Can you show me all your projects?',
    expected: ['list_owned_projects'],
  },
  {
    id: 'knowledge-portfolio-role',
    category: 'positive',
    message: 'What was your role on the TPWFC project?',
    expected: ['search_knowledge'],
  },

  // coding_stats: current/recent aggregate activity
  {
    id: 'stats-all-time',
    category: 'positive',
    message: 'How many total hours have you coded?',
    expected: ['coding_stats'],
  },
  {
    id: 'stats-this-week',
    category: 'positive',
    message: 'How much have you coded this week so far?',
    expected: ['coding_stats'],
  },
  {
    id: 'stats-current-total',
    category: 'positive',
    message: 'What is your current all-time coding total?',
    expected: ['coding_stats'],
  },
  {
    id: 'stats-combined',
    category: 'positive',
    message: 'How many hours have you coded recently, and what is your professional background?',
    expected: ['coding_stats', 'search_knowledge'],
  },
  {
    id: 'stats-today',
    category: 'positive',
    message: 'How many hours have you coded today?',
    expected: ['coding_history'],
  },
  {
    id: 'stats-lately',
    category: 'positive',
    message: 'How much coding have you done lately?',
    expected: ['coding_stats'],
  },

  // coding_history: explicit historical ranges and breakdowns
  {
    id: 'history-last-month',
    category: 'positive',
    message: 'How many hours did you code last month?',
    expected: ['coding_history'],
  },
  {
    id: 'history-last-year-languages',
    category: 'positive',
    message: 'Break down your coding by language for last year.',
    expected: ['coding_history'],
  },
  {
    id: 'history-all-projects-all-time',
    category: 'positive',
    message: 'How about the all time status for all the projects?',
    expected: ['coding_history'],
  },
  {
    id: 'history-project-daily',
    category: 'positive',
    message: 'How many hours did you spend coding on TPWFC last July, and what is TPWFC?',
    expected: ['coding_history', 'search_knowledge'],
  },
  {
    id: 'history-project-all-time-followup',
    category: 'positive',
    message: 'How about the all time status?',
    expected: ['coding_history'],
    history: [
      { role: 'user', content: 'What project did I spend most of my time on?' },
      {
        role: 'assistant',
        content: 'You spent the most time on canton-101-server: 33 hours and 4 minutes in the recent activity window.',
      },
      { role: 'user', content: 'What is the total coding time for that project?' },
      { role: 'assistant', content: 'The total was 33 hours and 4 minutes in the recent activity window.' },
    ],
    topicAnchors: [
      {
        question: 'What is the total coding time for canton-101-server?',
        observedAtUtc: '2026-09-25T00:00:00.000Z',
        tools: [
          {
            name: 'coding_history',
            arguments: { op: 'project_time', project: 'canton-101-server', from: '2026-08-27', to: '2026-09-25' },
            status: 'completed',
          },
        ],
      },
    ],
    toolOutputs: 'coding_history: canton-101-server — 33 hours and 4 minutes (2026-08-27 → 2026-09-25).',
  },
  {
    id: 'history-streak',
    category: 'positive',
    message: 'What was your longest coding streak this year?',
    expected: ['coding_history'],
  },
  {
    id: 'history-calendar-month',
    category: 'positive',
    message: 'How many hours did you code during March 2025?',
    expected: ['coding_history'],
  },
  {
    id: 'history-daily-series',
    category: 'positive',
    message: 'Show the day-by-day coding totals for August 2024.',
    expected: ['coding_history'],
  },
  {
    id: 'history-language-trend',
    category: 'positive',
    message: 'Which programming languages did you use most in 2023?',
    expected: ['coding_history'],
  },

  // site_content and combined source requests
  {
    id: 'site-latest-projects',
    category: 'positive',
    message: 'What are the latest projects published on your portfolio?',
    expected: ['site_content'],
  },
  {
    id: 'site-blog-post',
    category: 'positive',
    message: 'Summarize the newest article on this website.',
    expected: ['site_content'],
  },
  {
    id: 'site-showcase-membership',
    category: 'positive',
    message: 'Is TPWFC in your public project showcase, and where can I open it?',
    expected: ['site_content'],
  },
  {
    id: 'site-project-and-posts',
    category: 'positive',
    message: 'List your published projects and recent blog posts.',
    expected: ['site_content'],
  },
  {
    id: 'site-tech-stack',
    category: 'positive',
    message: 'What technology did you build this website with?',
    expected: ['search_knowledge'],
  },
  {
    id: 'site-demo-links',
    category: 'positive',
    message: 'Show me the live demo links for projects published on your portfolio.',
    expected: ['site_content'],
  },
  {
    id: 'site-topic-post',
    category: 'positive',
    message: 'Find your published article about security.',
    expected: ['site_content'],
  },

  // Verified context should prevent redundant retrieval for stable facts.
  {
    id: 'context-knowledge-already-answered',
    category: 'context',
    message: 'Can you repeat where I studied?',
    expected: [],
    history: [
      { role: 'assistant', content: 'Nelson studied at Example University.' },
      { role: 'user', content: 'Where did I study?' },
    ],
    evidence: 'Verified profile: Nelson studied at Example University.',
    topicAnchors: [
      {
        question: 'Where did Nelson study?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson education' }, status: 'completed' }],
      },
    ],
  },
  {
    id: 'context-stats-already-answered',
    category: 'context',
    message: 'Repeat that total, please.',
    expected: [],
    history: [{ role: 'assistant', content: 'Your all-time total is 1,234 hours.' }],
    toolOutputs: 'coding_stats: all-time total is 1,234 hours.',
    topicAnchors: [
      {
        question: 'What is Nelson’s all-time coding total?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' }, status: 'completed' }],
      },
    ],
  },
  {
    id: 'context-latest-still-live',
    category: 'positive',
    message: 'Which posts are the latest now?',
    expected: ['site_content'],
    history: [{ role: 'assistant', content: 'Last month the latest post was “Example”.' }],
  },
  {
    id: 'context-project-already-answered',
    category: 'context',
    message: 'Can you repeat what TPWFC does?',
    expected: [],
    history: [{ role: 'assistant', content: 'TPWFC is a private fire incident response and community exchange app.' }],
    evidence: 'Verified repository report: TPWFC is a private fire incident response and community exchange app.',
    topicAnchors: [
      {
        question: 'What does TPWFC do?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'search_knowledge', arguments: { query: 'TPWFC project purpose' }, status: 'completed' }],
      },
    ],
  },
  {
    id: 'followup-education-after-experience',
    category: 'positive',
    message: 'How about the education?',
    expected: ['search_knowledge'],
    history: [
      { role: 'user', content: 'Tell me about Nelson’s experience.' },
      { role: 'assistant', content: 'Nelson has experience in customer service and automotive work.' },
    ],
    topicAnchors: [
      {
        question: 'Tell me about Nelson’s experience.',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson work experience' }, status: 'completed' }],
      },
    ],
  },
  {
    id: 'followup-project-after-unrelated-turns',
    category: 'positive',
    message: 'What does that project do?',
    expected: ['search_knowledge'],
    history: [
      { role: 'user', content: 'What is the weather today?' },
      { role: 'assistant', content: 'I do not have a weather source.' },
    ],
    topicAnchors: [
      {
        question: 'What project is Nelson currently working on?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [
          {
            name: 'coding_history',
            arguments: { op: 'by_project', from: '2026-08-26', to: '2026-09-24' },
            status: 'completed',
          },
          {
            name: 'search_knowledge',
            arguments: { query: 'What project is Nelson currently working on?' },
            status: 'completed',
          },
        ],
      },
    ],
  },
  {
    id: 'followup-partial-education-answer-requeries',
    category: 'positive',
    message: 'Can you give me your full education history?',
    expected: ['search_knowledge'],
    history: [{ role: 'assistant', content: 'Nelson completed a Certificate IV at TAFE.' }],
    topicAnchors: [
      {
        question: 'How about Nelson’s education?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson education' }, status: 'completed' }],
      },
    ],
  },
  {
    id: 'followup-thanks-skips-tools',
    category: 'negative',
    message: 'Thanks!',
    expected: [],
    history: [{ role: 'assistant', content: 'Nelson completed a Certificate IV at TAFE.' }],
    topicAnchors: [
      {
        question: 'How about Nelson’s education?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson education' }, status: 'completed' }],
      },
    ],
  },
  {
    id: 'followup-accepts-offered-coding-tools',
    category: 'positive',
    message: 'yes please',
    expected: ['coding_stats', 'coding_history'],
    history: [
      { role: 'user', content: 'How about the coding hours?' },
      {
        role: 'assistant',
        content: 'I do not have public-share or coding-history data available. Want me to try pulling that data?',
      },
    ],
  },
  {
    id: 'followup-refuses-offered-coding-tools',
    category: 'negative',
    message: 'no thanks',
    expected: [],
    history: [
      { role: 'user', content: 'How about the coding hours?' },
      {
        role: 'assistant',
        content: 'I do not have public-share or coding-history data available. Want me to try pulling that data?',
      },
    ],
  },
  {
    id: 'followup-current-project-requeries-fresh-wakatime',
    category: 'positive',
    message: 'What project are you working on now?',
    expected: ['coding_history', 'search_knowledge'],
    topicAnchors: [
      {
        question: 'What project is Nelson currently working on?',
        observedAtUtc: '2026-08-01T00:00:00.000Z',
        tools: [
          {
            name: 'coding_history',
            arguments: { op: 'by_project', from: '2026-07-03', to: '2026-08-01' },
            status: 'completed',
          },
          {
            name: 'search_knowledge',
            arguments: { query: 'What project is Nelson currently working on?' },
            status: 'completed',
          },
        ],
      },
    ],
  },
  {
    id: 'context-live-stats-already-answered',
    category: 'context',
    message: 'What was the live all-time total you just found?',
    expected: [],
    toolOutputs: 'coding_stats: current all-time total is 1,234 hours.',
    topicAnchors: [
      {
        question: 'What is the live all-time coding total?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' }, status: 'completed' }],
      },
    ],
  },
  {
    id: 'followup-total-count-after-partial-public-list',
    category: 'positive',
    message: 'What is your total projects count?',
    expected: ['list_owned_projects'],
    history: [
      { role: 'user', content: 'Here are my projects?' },
      {
        role: 'assistant',
        content:
          'Here are 10 public repositories: claude-code-sub-agents, toonconv, super-opencode, smartplay-hk-oss, opencode-commands, github-readme-stats, typo-sync-server, CantoCap, canto-101-web, canto-101-server. This covers all 10 public repositories.',
      },
    ],
    topicAnchors: [
      {
        question: 'Here are my projects?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'list_owned_projects', arguments: {}, status: 'completed' }],
      },
    ],
  },
  {
    id: 'context-total-count-already-answered',
    category: 'context',
    message: 'Repeat that total, please.',
    expected: [],
    history: [{ role: 'assistant', content: 'I have 111 owned projects in total, including public and private.' }],
    toolOutputs: 'list_owned_projects: total 111 owned projects, including public and private.',
    topicAnchors: [
      {
        question: 'What is your total projects count?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'list_owned_projects', arguments: {}, status: 'completed' }],
      },
    ],
  },
  {
    id: 'followup-bare-what-is-your-projects',
    category: 'positive',
    message: 'what is your projects?',
    expected: ['list_owned_projects'],
  },
  {
    id: 'followup-total-number-after-rag-summary',
    category: 'positive',
    message: 'what is the total number of project you did?',
    expected: ['list_owned_projects'],
    history: [
      {
        role: 'assistant',
        content:
          'Here is a summary of my projects based on my public GitHub repositories: claude-code-sub-agents, qwen3-tts-rs, QwenASR, smartplay-hk-oss, gnaf-autocomplete, github-readme-stats, typo-sync-server, CantoCap, super-opencode, lst97. I also have a private repository.',
      },
    ],
    topicAnchors: [
      {
        question: 'what is your projects?',
        observedAtUtc: '2026-09-24T00:00:00.000Z',
        tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson projects' }, status: 'completed' }],
      },
    ],
  },

  // False-positive guards: assistant-directed “you”, general facts, and tasks
  // that do not need one of these private/live sources.
  { id: 'negative-assistant-capabilities', category: 'negative', message: 'What can you help me with?', expected: [] },
  {
    id: 'negative-assistant-identity',
    category: 'negative',
    message: 'Who are you, the chat assistant?',
    expected: [],
  },
  {
    id: 'negative-assistant-routing',
    category: 'negative',
    message: 'How do you decide whether to search my profile or project data?',
    expected: [],
  },
  {
    id: 'negative-assistant-pipeline',
    category: 'negative',
    message: 'How does this chat process my question from submission to answer?',
    expected: [],
  },
  {
    id: 'technical-question-rag',
    category: 'positive',
    message: 'What does retrieval-augmented generation mean?',
    expected: ['search_knowledge'],
  },
  {
    id: 'technical-question-react-state',
    category: 'positive',
    message: 'Explain how React state updates work.',
    expected: ['search_knowledge'],
  },
  {
    id: 'negative-unrelated-current-fact',
    category: 'negative',
    message: 'What is the current population of Melbourne?',
    expected: [],
  },
  {
    id: 'negative-general-howto',
    category: 'negative',
    message: 'How do I build a portfolio website with a blog?',
    expected: [],
  },
  {
    id: 'negative-writing-task',
    category: 'negative',
    message: 'Write a short thank-you note for my neighbour.',
    expected: [],
  },
  { id: 'negative-ai-limitation', category: 'negative', message: 'Can AI systems hallucinate?', expected: [] },
  {
    id: 'negative-advice-portfolio',
    category: 'negative',
    message: 'What projects should I build for my portfolio?',
    expected: [],
  },
  {
    id: 'negative-github-general',
    category: 'negative',
    message: 'How do I discover interesting projects on GitHub?',
    expected: [],
  },
  {
    id: 'negative-general-repo-terms',
    category: 'negative',
    message: 'What is the difference between a public and private repository?',
    expected: [],
  },
  {
    id: 'technical-question-backend-technologies',
    category: 'positive',
    message: 'Which technologies are commonly used for backend development?',
    expected: ['search_knowledge'],
  },
  {
    id: 'negative-tool-capabilities',
    category: 'negative',
    message: 'What sources can you search, and how do you choose between them?',
    expected: [],
  },
  {
    id: 'negative-site-recommendation',
    category: 'negative',
    message: 'How should I organize projects on my own portfolio site?',
    expected: [],
  },
  {
    id: 'negative-writing-about-portfolio',
    category: 'negative',
    message: 'Help me write a portfolio project description for a weather app.',
    expected: [],
  },

  // More second-person boundary cases. Generic “you” alone must not trigger a
  // source; personal facts belong to Nelson while assistant-process questions
  // do not.
  {
    id: 'technical-question-database-advice',
    category: 'positive',
    message: 'What should you consider when choosing a database?',
    expected: ['search_knowledge'],
  },
  {
    id: 'negative-you-chat-feature',
    category: 'negative',
    message: 'Can you explain how your chat interface works?',
    expected: [],
  },
  {
    id: 'positive-you-personal-skill',
    category: 'positive',
    message: 'Which programming languages do you know?',
    expected: ['search_knowledge'],
  },
  {
    id: 'positive-you-projects',
    category: 'positive',
    message: 'What projects have you built?',
    expected: ['list_owned_projects'],
  },

  // Unframed software-development questions are answered from the interview Q&A
  // corpus, so they reach search_knowledge without naming Nelson or a project.
  {
    id: 'technical-question-split-expense-cents',
    category: 'positive',
    message: 'How would you handle the remaining cents when splitting an expense?',
    expected: ['search_knowledge'],
  },
  {
    id: 'technical-question-production-monitoring',
    category: 'positive',
    message: 'What would you monitor in a production web application?',
    expected: ['search_knowledge'],
  },
  {
    id: 'technical-question-architecture-today',
    category: 'positive',
    message: 'What would you do differently in the Best Maker architecture today?',
    expected: ['search_knowledge'],
  },
  {
    id: 'technical-question-promise-async-await',
    category: 'positive',
    message: 'What is the difference between Promise, async, and await?',
    expected: ['search_knowledge'],
  },
  {
    id: 'technical-question-safe-deploy',
    category: 'positive',
    message: 'How do you make a deployment safe when the API and database release separately?',
    expected: ['search_knowledge'],
  },

  // Nelson-opinion questions are answered from his recorded views in the blog
  // corpus, so they reach search_knowledge without any site-publication
  // framing. Verified live against Jev: each routes search_knowledge/use with
  // every other source skipped, and pgvector returns the matching blog topic
  // in the top results.
  {
    id: 'opinion-vibe-coding-view',
    category: 'positive',
    message: 'What is your view on vibe coding?',
    expected: ['search_knowledge'],
  },
  {
    id: 'opinion-junior-developers-ai',
    category: 'positive',
    message: 'What do you think about AI replacing junior developers?',
    expected: ['search_knowledge'],
  },
  {
    id: 'opinion-code-is-cheap',
    category: 'positive',
    message: 'Do you think code is cheap?',
    expected: ['search_knowledge'],
  },

  // Commercial-offer questions are answered from the indexed `services`
  // documents. The negative case is the regression guard: the offer vocabulary
  // deliberately omits a bare "website", so a question about how THIS site is
  // built must stay on search_knowledge rather than being answered with prices.
  { id: 'services-pricing', category: 'positive', message: 'How much does a website cost?', expected: ['services'] },
  {
    id: 'services-package-inclusions',
    category: 'positive',
    message: 'What is included in the Business package?',
    expected: ['services'],
  },
  {
    id: 'services-process',
    category: 'positive',
    message: 'How does the website development process work?',
    expected: ['services'],
  },
  { id: 'services-quote', category: 'positive', message: 'How do I request a quote?', expected: ['services'] },
  { id: 'site-implementation-not-services', category: 'negative', message: 'How is this website built?', expected: [] },
  // The Go Support Plan is the same published page, so it routes to the same
  // source. These phrases are the ones a visitor with a broken deployment
  // actually types; none of them contain "services" or "pricing".
  {
    id: 'services-support-plan',
    category: 'positive',
    message: 'What is the Go Support Plan?',
    expected: ['services'],
  },
  {
    id: 'services-technical-consultation',
    category: 'positive',
    message: 'How much is a technical consultation?',
    expected: ['services'],
  },
  { id: 'services-hourly-rate', category: 'positive', message: 'Do you offer hourly support?', expected: ['services'] },
]
