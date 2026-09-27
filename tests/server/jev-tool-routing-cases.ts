import type { AgentToolName } from '../../src/server/chat/agent-tools'
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
  { id: 'knowledge-profile', category: 'positive', message: 'What did I study, and where have I worked?', expected: ['search_knowledge'] },
  { id: 'knowledge-you', category: 'positive', message: 'What is your professional experience and what skills do you have?', expected: ['search_knowledge'] },
  { id: 'knowledge-contributions', category: 'positive', message: 'Which repositories have you contributed to?', expected: ['search_knowledge'] },
  { id: 'knowledge-unknown-project', category: 'positive', message: 'What does TPWFC do?', expected: ['search_knowledge'] },
  { id: 'knowledge-owner-project-demos', category: 'positive', message: 'Do you have some live demo about your project?', expected: ['search_knowledge'] },
  { id: 'knowledge-project-demo-and-publication', category: 'positive', message: 'What demo URL do you have for GNAF Autocomplete, and is it published on your portfolio?', expected: ['search_knowledge', 'site_content'] },
  { id: 'knowledge-current-project', category: 'positive', message: 'What project are you currently working on?', expected: ['coding_history', 'search_knowledge'] },
  { id: 'knowledge-current-project-today', category: 'positive', message: 'What project are you working on today?', expected: ['coding_history', 'search_knowledge'] },
  { id: 'knowledge-typo-project', category: 'positive', message: 'Can you explain the project called TPFWC?', expected: ['search_knowledge'] },
  { id: 'knowledge-combined-facts', category: 'positive', message: 'Tell me about your education, work history, and coding skills.', expected: ['search_knowledge'] },
  { id: 'knowledge-currently-building', category: 'positive', message: 'What are you working on right now?', expected: ['coding_history', 'search_knowledge'] },
  { id: 'knowledge-repos-owned', category: 'positive', message: 'Which of your repositories do you own versus contribute to?', expected: ['search_knowledge'] },
  { id: 'projects-next-batch', category: 'positive', message: 'Show me more', expected: ['list_owned_projects'], history: [{ role: 'assistant', content: 'Here are some recent projects: GNAF Autocomplete, TicketQueue.' }] },
  { id: 'projects-all-owned-inventory', category: 'positive', message: 'Can you show me all your projects?', expected: ['list_owned_projects'] },
  { id: 'knowledge-portfolio-role', category: 'positive', message: 'What was your role on the TPWFC project?', expected: ['search_knowledge'] },

  // coding_stats: current/recent aggregate activity
  { id: 'stats-all-time', category: 'positive', message: 'How many total hours have you coded?', expected: ['coding_stats'] },
  { id: 'stats-this-week', category: 'positive', message: 'How much have you coded this week so far?', expected: ['coding_stats'] },
  { id: 'stats-current-total', category: 'positive', message: 'What is your current all-time coding total?', expected: ['coding_stats'] },
  { id: 'stats-combined', category: 'positive', message: 'How many hours have you coded recently, and what is your professional background?', expected: ['coding_stats', 'search_knowledge'] },
  { id: 'stats-today', category: 'positive', message: 'How many hours have you coded today?', expected: ['coding_history'] },
  { id: 'stats-lately', category: 'positive', message: 'How much coding have you done lately?', expected: ['coding_stats'] },

  // coding_history: explicit historical ranges and breakdowns
  { id: 'history-last-month', category: 'positive', message: 'How many hours did you code last month?', expected: ['coding_history'] },
  { id: 'history-last-year-languages', category: 'positive', message: 'Break down your coding by language for last year.', expected: ['coding_history'] },
  { id: 'history-all-projects-all-time', category: 'positive', message: 'How about the all time status for all the projects?', expected: ['coding_history'] },
  { id: 'history-project-daily', category: 'positive', message: 'How many hours did you spend coding on TPWFC last July, and what is TPWFC?', expected: ['coding_history', 'search_knowledge'] },
  {
    id: 'history-project-all-time-followup', category: 'positive', message: 'How about the all time status?',
    expected: ['coding_history'],
    history: [
      { role: 'user', content: 'What project did I spend most of my time on?' },
      { role: 'assistant', content: 'You spent the most time on canton-101-server: 33 hours and 4 minutes in the recent activity window.' },
      { role: 'user', content: 'What is the total coding time for that project?' },
      { role: 'assistant', content: 'The total was 33 hours and 4 minutes in the recent activity window.' },
    ],
    topicAnchors: [{ question: 'What is the total coding time for canton-101-server?', observedAtUtc: '2026-09-25T00:00:00.000Z', tools: [{ name: 'coding_history', arguments: { op: 'project_time', project: 'canton-101-server', from: '2026-08-27', to: '2026-09-25' }, status: 'completed' }] }],
    toolOutputs: 'coding_history: canton-101-server — 33 hours and 4 minutes (2026-08-27 → 2026-09-25).',
  },
  { id: 'history-streak', category: 'positive', message: 'What was your longest coding streak this year?', expected: ['coding_history'] },
  { id: 'history-calendar-month', category: 'positive', message: 'How many hours did you code during March 2025?', expected: ['coding_history'] },
  { id: 'history-daily-series', category: 'positive', message: 'Show the day-by-day coding totals for August 2024.', expected: ['coding_history'] },
  { id: 'history-language-trend', category: 'positive', message: 'Which programming languages did you use most in 2023?', expected: ['coding_history'] },

  // site_content and combined source requests
  { id: 'site-latest-projects', category: 'positive', message: 'What are the latest projects published on your portfolio?', expected: ['site_content'] },
  { id: 'site-blog-post', category: 'positive', message: 'Summarize the newest article on this website.', expected: ['site_content'] },
  { id: 'site-showcase-membership', category: 'positive', message: 'Is TPWFC in your public project showcase, and where can I open it?', expected: ['site_content'] },
  { id: 'site-project-and-posts', category: 'positive', message: 'List your published projects and recent blog posts.', expected: ['site_content'] },
  { id: 'site-tech-stack', category: 'positive', message: 'What technology did you build this website with?', expected: ['search_knowledge'] },
  { id: 'site-demo-links', category: 'positive', message: 'Show me the live demo links for projects published on your portfolio.', expected: ['site_content'] },
  { id: 'site-topic-post', category: 'positive', message: 'Find your published article about security.', expected: ['site_content'] },

  // Verified context should prevent redundant retrieval for stable facts.
  {
    id: 'context-knowledge-already-answered', category: 'context', message: 'Can you repeat where I studied?',
    expected: [], history: [{ role: 'assistant', content: 'Nelson studied at Example University.' }, { role: 'user', content: 'Where did I study?' }],
    evidence: 'Verified profile: Nelson studied at Example University.',
    topicAnchors: [{ question: 'Where did Nelson study?', observedAtUtc: '2026-09-24T00:00:00.000Z', tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson education' }, status: 'completed' }] }],
  },
  {
    id: 'context-stats-already-answered', category: 'context', message: 'Repeat that total, please.',
    expected: [], history: [{ role: 'assistant', content: 'Your all-time total is 1,234 hours.' }],
    toolOutputs: 'coding_stats: all-time total is 1,234 hours.',
    topicAnchors: [{ question: 'What is Nelson’s all-time coding total?', observedAtUtc: '2026-09-24T00:00:00.000Z', tools: [{ name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' }, status: 'completed' }] }],
  },
  { id: 'context-latest-still-live', category: 'positive', message: 'Which posts are the latest now?', expected: ['site_content'], history: [{ role: 'assistant', content: 'Last month the latest post was “Example”.' }] },
  {
    id: 'context-project-already-answered', category: 'context', message: 'Can you repeat what TPWFC does?',
    expected: [], history: [{ role: 'assistant', content: 'TPWFC is a private fire incident response and community exchange app.' }],
    evidence: 'Verified repository report: TPWFC is a private fire incident response and community exchange app.',
    topicAnchors: [{ question: 'What does TPWFC do?', observedAtUtc: '2026-09-24T00:00:00.000Z', tools: [{ name: 'search_knowledge', arguments: { query: 'TPWFC project purpose' }, status: 'completed' }] }],
  },
  {
    id: 'followup-education-after-experience', category: 'positive', message: 'How about the education?',
    expected: ['search_knowledge'],
    history: [
      { role: 'user', content: 'Tell me about Nelson’s experience.' },
      { role: 'assistant', content: 'Nelson has experience in customer service and automotive work.' },
    ],
    topicAnchors: [{
      question: 'Tell me about Nelson’s experience.', observedAtUtc: '2026-09-24T00:00:00.000Z',
      tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson work experience' }, status: 'completed' }],
    }],
  },
  {
    id: 'followup-project-after-unrelated-turns', category: 'positive', message: 'What does that project do?',
    expected: ['search_knowledge'],
    history: [
      { role: 'user', content: 'What is the weather today?' },
      { role: 'assistant', content: 'I do not have a weather source.' },
    ],
    topicAnchors: [{
      question: 'What project is Nelson currently working on?', observedAtUtc: '2026-09-24T00:00:00.000Z',
      tools: [
        { name: 'coding_history', arguments: { op: 'by_project', from: '2026-08-26', to: '2026-09-24' }, status: 'completed' },
        { name: 'search_knowledge', arguments: { query: 'What project is Nelson currently working on?' }, status: 'completed' },
      ],
    }],
  },
  {
    id: 'followup-partial-education-answer-requeries', category: 'positive', message: 'Can you give me your full education history?',
    expected: ['search_knowledge'],
    history: [{ role: 'assistant', content: 'Nelson completed a Certificate IV at TAFE.' }],
    topicAnchors: [{
      question: 'How about Nelson’s education?', observedAtUtc: '2026-09-24T00:00:00.000Z',
      tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson education' }, status: 'completed' }],
    }],
  },
  {
    id: 'followup-thanks-skips-tools', category: 'negative', message: 'Thanks!', expected: [],
    history: [{ role: 'assistant', content: 'Nelson completed a Certificate IV at TAFE.' }],
    topicAnchors: [{
      question: 'How about Nelson’s education?', observedAtUtc: '2026-09-24T00:00:00.000Z',
      tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson education' }, status: 'completed' }],
    }],
  },
  {
    id: 'followup-accepts-offered-coding-tools', category: 'positive', message: 'yes please', expected: ['coding_stats', 'coding_history'],
    history: [
      { role: 'user', content: 'How about the coding hours?' },
      { role: 'assistant', content: 'I do not have public-share or coding-history data available. Want me to try pulling that data?' },
    ],
  },
  {
    id: 'followup-refuses-offered-coding-tools', category: 'negative', message: 'no thanks', expected: [],
    history: [
      { role: 'user', content: 'How about the coding hours?' },
      { role: 'assistant', content: 'I do not have public-share or coding-history data available. Want me to try pulling that data?' },
    ],
  },
  {
    id: 'followup-current-project-requeries-fresh-wakatime', category: 'positive', message: 'What project are you working on now?',
    expected: ['coding_history', 'search_knowledge'],
    topicAnchors: [{
      question: 'What project is Nelson currently working on?', observedAtUtc: '2026-08-01T00:00:00.000Z',
      tools: [
        { name: 'coding_history', arguments: { op: 'by_project', from: '2026-07-03', to: '2026-08-01' }, status: 'completed' },
        { name: 'search_knowledge', arguments: { query: 'What project is Nelson currently working on?' }, status: 'completed' },
      ],
    }],
  },
  {
    id: 'context-live-stats-already-answered', category: 'context', message: 'What was the live all-time total you just found?',
    expected: [], toolOutputs: 'coding_stats: current all-time total is 1,234 hours.',
    topicAnchors: [{ question: 'What is the live all-time coding total?', observedAtUtc: '2026-09-24T00:00:00.000Z', tools: [{ name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' }, status: 'completed' }] }],
  },

  // False-positive guards: assistant-directed “you”, general facts, and tasks
  // that do not need one of these private/live sources.
  { id: 'negative-assistant-capabilities', category: 'negative', message: 'What can you help me with?', expected: [] },
  { id: 'negative-assistant-identity', category: 'negative', message: 'Who are you, the chat assistant?', expected: [] },
  { id: 'negative-assistant-routing', category: 'negative', message: 'How do you decide whether to search my profile or project data?', expected: [] },
  { id: 'negative-assistant-pipeline', category: 'negative', message: 'How does this chat process my question from submission to answer?', expected: [] },
  { id: 'negative-general-rag', category: 'negative', message: 'What does retrieval-augmented generation mean?', expected: [] },
  { id: 'negative-general-react', category: 'negative', message: 'Explain how React state updates work.', expected: [] },
  { id: 'negative-unrelated-current-fact', category: 'negative', message: 'What is the current population of Melbourne?', expected: [] },
  { id: 'negative-general-howto', category: 'negative', message: 'How do I build a portfolio website with a blog?', expected: [] },
  { id: 'negative-writing-task', category: 'negative', message: 'Write a short thank-you note for my neighbour.', expected: [] },
  { id: 'negative-ai-limitation', category: 'negative', message: 'Can AI systems hallucinate?', expected: [] },
  { id: 'negative-advice-portfolio', category: 'negative', message: 'What projects should I build for my portfolio?', expected: [] },
  { id: 'negative-github-general', category: 'negative', message: 'How do I discover interesting projects on GitHub?', expected: [] },
  { id: 'negative-general-repo-terms', category: 'negative', message: 'What is the difference between a public and private repository?', expected: [] },
  { id: 'negative-general-backend', category: 'negative', message: 'Which technologies are commonly used for backend development?', expected: [] },
  { id: 'negative-tool-capabilities', category: 'negative', message: 'What sources can you search, and how do you choose between them?', expected: [] },
  { id: 'negative-site-recommendation', category: 'negative', message: 'How should I organize projects on my own portfolio site?', expected: [] },
  { id: 'negative-writing-about-portfolio', category: 'negative', message: 'Help me write a portfolio project description for a weather app.', expected: [] },

  // More second-person boundary cases. Generic “you” alone must not trigger a
  // source; personal facts belong to Nelson while assistant-process questions
  // do not.
  { id: 'negative-you-general-advice', category: 'negative', message: 'What should you consider when choosing a database?', expected: [] },
  { id: 'negative-you-chat-feature', category: 'negative', message: 'Can you explain how your chat interface works?', expected: [] },
  { id: 'positive-you-personal-skill', category: 'positive', message: 'Which programming languages do you know?', expected: ['search_knowledge'] },
  { id: 'positive-you-projects', category: 'positive', message: 'What projects have you built?', expected: ['list_owned_projects'] },
]
