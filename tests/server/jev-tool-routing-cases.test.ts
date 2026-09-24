import { describe, expect, it } from 'bun:test'

import { jevToolRoutingCases } from './jev-tool-routing-cases'
import type { AgentToolName } from '../../src/server/chat/agent-tools'

const tools: AgentToolName[] = ['search_knowledge', 'coding_stats', 'coding_history', 'site_content']

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
    expect(byId.get('followup-exact-education-answer-retained')?.expected).toEqual([])
    expect(byId.get('followup-thanks-skips-tools')?.expected).toEqual([])
    expect(byId.get('followup-current-project-requeries-fresh-wakatime')?.expected).toEqual(['coding_history', 'search_knowledge'])

    for (const testCase of jevToolRoutingCases.filter(({ id }) => id.startsWith('followup-'))) {
      expect(testCase.topicAnchors?.length).toBeGreaterThan(0)
    }
  })
})
