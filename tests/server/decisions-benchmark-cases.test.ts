import { describe, expect, it } from 'bun:test'

import { CHAT_CONTACT_TEMPLATES } from '../../src/lib/chat-contact'
import {
  chatBenchmarkCases,
  contactDirectBenchmarkCases,
  contactWorkflowBenchmarkCases,
  relevanceBenchmarkCases,
  routingBenchmarkCases,
} from './decisions-benchmark-cases'

const ALL_CASES = [
  ...chatBenchmarkCases,
  ...contactDirectBenchmarkCases,
  ...contactWorkflowBenchmarkCases,
  ...relevanceBenchmarkCases,
  ...routingBenchmarkCases,
]

describe('decision benchmark corpus', () => {
  it('has unique case ids across every surface', () => {
    const ids = ALL_CASES.map((testCase) => testCase.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every case a non-empty id and message or query', () => {
    for (const testCase of ALL_CASES) {
      expect(testCase.id.length).toBeGreaterThan(0)
      const text = 'message' in testCase ? testCase.message : testCase.query
      expect(text.length).toBeGreaterThan(0)
    }
  })

  it('expects every hostile case to be blocked', () => {
    const hostile = ALL_CASES.filter(
      (testCase): testCase is typeof testCase & { expected: { allowed: boolean } } =>
        'hostile' in testCase && testCase.hostile === true,
    )
    expect(hostile.length).toBeGreaterThanOrEqual(10)
    for (const testCase of hostile) {
      expect(testCase.expected.allowed).toBe(false)
    }
  })

  it('keeps a positive control for every safety-scored surface', () => {
    expect(chatBenchmarkCases.some((testCase) => testCase.labels?.safety === 'safe')).toBe(true)
    expect(chatBenchmarkCases.some((testCase) => testCase.labels?.safety === 'unsafe')).toBe(true)
    expect(contactDirectBenchmarkCases.some((testCase) => testCase.expected.allowed)).toBe(true)
    expect(contactWorkflowBenchmarkCases.some((testCase) => testCase.expected.allowed)).toBe(true)
  })

  it('uses schema-valid contact workflow phases, templates, and field keys', () => {
    for (const testCase of contactWorkflowBenchmarkCases) {
      const template = CHAT_CONTACT_TEMPLATES[testCase.template]
      expect(template).toBeDefined()
      const validKeys = new Set(template.fields.map((field) => field.key))
      for (const key of Object.keys(testCase.fields)) {
        expect(validKeys.has(key as never)).toBe(true)
      }
      expect(['template', 'form']).toContain(testCase.phase)
      if (testCase.phase === 'template') expect(Object.keys(testCase.fields)).toHaveLength(0)
    }
  })

  it('routing expectations stay within the tool tuple and cover all six tools', () => {
    const covered = new Set<string>()
    for (const testCase of routingBenchmarkCases) {
      for (const tool of testCase.expected) covered.add(tool)
    }
    expect([...covered].sort()).toEqual([
      'coding_history',
      'coding_stats',
      'list_owned_projects',
      'search_knowledge',
      'services',
      'site_content',
    ])
  })

  it('declares both gate outcomes in the relevance corpus', () => {
    const promoted = relevanceBenchmarkCases.filter(
      (testCase) => testCase.expected.isRelevant && testCase.expected.containsEvidence,
    )
    const rejected = relevanceBenchmarkCases.filter(
      (testCase) => !testCase.expected.isRelevant && !testCase.expected.containsEvidence,
    )
    expect(promoted.length).toBeGreaterThanOrEqual(5)
    expect(rejected.length).toBeGreaterThanOrEqual(5)
  })

  it('keeps chat expectations internally consistent with declared labels', () => {
    for (const testCase of chatBenchmarkCases) {
      if (testCase.expected.allowed === false && testCase.expected.reason === 'out_of_scope') {
        expect(testCase.labels?.scope === 'out_of_scope' || testCase.labels?.scope === undefined).toBe(true)
      }
      if (testCase.expected.contactIntent === 'contact') {
        expect(testCase.labels?.contactIntent).toBe('contact')
      }
    }
  })
})
