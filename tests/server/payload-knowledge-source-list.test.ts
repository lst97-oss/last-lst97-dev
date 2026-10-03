import { describe, expect, it } from 'bun:test'

import { createPayloadKnowledgeSourceList } from '../../src/server/knowledge/payload-runtime'

describe('scheduled Payload knowledge source list', () => {
  it('leaves GitHub repository reports to the dedicated code-grounded sync', () => {
    const listDocuments = async () => []
    const fetch = async () => null
    const sources = createPayloadKnowledgeSourceList({
      post: { type: 'post', fetch, listDocuments },
      project: { type: 'project', fetch, listDocuments },
      profile: { type: 'profile', fetch, listDocuments },
      wakatime: { type: 'wakatime', fetch, listDocuments },
    })

    expect(sources.map(({ type }) => type)).toEqual(['post', 'project', 'profile', 'wakatime'])
  })

  it('omits the profile source so its biography is not stored twice', () => {
    const listDocuments = async () => []
    const fetch = async () => null
    const sources = createPayloadKnowledgeSourceList({
      post: { type: 'post', fetch, listDocuments },
      project: { type: 'project', fetch, listDocuments },
      wakatime: { type: 'wakatime', fetch, listDocuments },
    })

    expect(sources.map(({ type }) => type)).toEqual(['post', 'project', 'wakatime'])
    expect(sources.map(({ type }) => type)).not.toContain('profile')
  })
})
