import { describe, expect, it } from 'bun:test'
import type { AgentToolName } from '../../src/server/chat/tools/agent-tools'
import { jevToolRoutingCases } from './jev-tool-routing-cases'

const tools: AgentToolName[] = [
  'search_knowledge',
  'list_owned_projects',
  'coding_stats',
  'coding_history',
  'site_content',
  'services',
]

describe('Jev tool-routing baseline', () => {
  it('contains unique, categorized, per-tool positive and negative cases', () => {
    const ids = jevToolRoutingCases.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(jevToolRoutingCases.length).toBeGreaterThanOrEqual(32)
    expect(jevToolRoutingCases.some(({ category }) => category === 'positive')).toBe(true)
    expect(jevToolRoutingCases.some(({ category }) => category === 'negative')).toBe(true)

    for (const testCase of jevToolRoutingCases) {
      expect(testCase.expected.every((tool) => tools.includes(tool))).toBe(true)
    }
    for (const tool of tools) {
      expect(jevToolRoutingCases.some(({ expected }) => expected.includes(tool))).toBe(true)
      expect(jevToolRoutingCases.some(({ expected }) => !expected.includes(tool))).toBe(true)
    }
  })

  it('keeps assistant-directed second-person queries out of personal-source expectations', () => {
    const byId = new Map(jevToolRoutingCases.map((testCase) => [testCase.id, testCase]))
    expect(byId.get('knowledge-current-project')?.expected).toEqual(['coding_history', 'search_knowledge'])
    expect(byId.get('negative-assistant-routing')?.expected).toEqual([])
    expect(byId.get('negative-assistant-pipeline')?.expected).toEqual([])
  })

  it('covers multi-turn follow-ups with signed source anchors', () => {
    const byId = new Map(jevToolRoutingCases.map((testCase) => [testCase.id, testCase]))
    expect(byId.get('followup-education-after-experience')?.expected).toEqual(['search_knowledge'])
    expect(byId.get('followup-project-after-unrelated-turns')?.expected).toEqual(['search_knowledge'])
    expect(byId.get('followup-partial-education-answer-requeries')?.expected).toEqual(['search_knowledge'])
    expect(byId.get('followup-thanks-skips-tools')?.expected).toEqual([])
    expect(byId.get('followup-current-project-requeries-fresh-wakatime')?.expected).toEqual([
      'coding_history',
      'search_knowledge',
    ])
    expect(byId.get('history-project-all-time-followup')?.expected).toEqual(['coding_history'])
    expect(byId.get('history-project-all-time-followup')?.history?.at(-1)?.content).toBe(
      'The total was 33 hours and 4 minutes in the recent activity window.',
    )

    // A follow-up that resumes an earlier turn must carry the signed anchors
    // that turn produced. Cases with no `history` are single-turn probes that
    // legitimately have no prior anchor, so they are excluded rather than
    // forced to invent one.
    for (const testCase of jevToolRoutingCases.filter(
      ({ id, history }) =>
        id.startsWith('followup-') &&
        (history?.length ?? 0) > 0 &&
        id !== 'followup-accepts-offered-coding-tools' &&
        id !== 'followup-refuses-offered-coding-tools',
    )) {
      expect(testCase.topicAnchors?.length ?? 0).toBeGreaterThan(0)
    }
    expect(byId.get('followup-accepts-offered-coding-tools')?.expected).toEqual(['coding_stats', 'coding_history'])
    expect(byId.get('followup-refuses-offered-coding-tools')?.expected).toEqual([])
  })

  it('covers repeat owned-project discovery separately from the published showcase', () => {
    const byId = new Map(jevToolRoutingCases.map((testCase) => [testCase.id, testCase]))
    expect(byId.get('projects-next-batch')?.expected).toEqual(['list_owned_projects'])
    expect(byId.get('projects-all-owned-inventory')?.expected).toEqual(['list_owned_projects'])
    expect(byId.get('positive-you-projects')?.expected).toEqual(['list_owned_projects'])
    expect(byId.get('followup-total-count-after-partial-public-list')?.expected).toEqual(['list_owned_projects'])
    expect(byId.get('followup-bare-what-is-your-projects')?.expected).toEqual(['list_owned_projects'])
    expect(byId.get('followup-total-number-after-rag-summary')?.expected).toEqual(['list_owned_projects'])
    expect(byId.get('context-total-count-already-answered')?.expected).toEqual([])
    expect(byId.get('site-latest-projects')?.expected).toEqual(['site_content'])
  })

  it('routes an all-project coding-time follow-up to historical per-project data', () => {
    const byId = new Map(jevToolRoutingCases.map((testCase) => [testCase.id, testCase]))
    expect(byId.get('history-all-projects-all-time')?.expected).toEqual(['coding_history'])
  })
})
