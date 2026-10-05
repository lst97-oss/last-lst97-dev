import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { useMemo, useState } from 'react'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { TopicSummary } from '@/server/content/types'

/**
 * The topic filter above a listing.
 *
 * One component for both listings because the markup is identical; only the
 * router target and the label differ. The filter lives in the URL rather than in
 * component state, so a filtered listing is shareable, survives a reload, and
 * keeps working with `ContentPagination`, which already preserves unknown search
 * params when it builds page links.
 *
 * The chip row is collapsible and carries its own narrow filter box: the topic
 * vocabulary grows with the archive, and a flat row of every topic stops being
 * scannable well before it stops fitting. The box filters the loaded list, so
 * narrowing needs no query and no loader run.
 */
export function ListFilters({
  activeTopic,
  to,
  topics,
  what,
}: {
  /** Slug of the topic currently filtering, or undefined for "All". */
  activeTopic?: string
  /** Where the chips link: `/projects` or `/blog`. */
  to: '/projects' | '/blog'
  topics: TopicSummary[]
  /** Plural noun for labels: "projects" or "notes". */
  what: 'projects' | 'notes'
}) {
  const navigate = useNavigate()
  const [topicQuery, setTopicQuery] = useState('')

  const visibleTopics = useMemo(() => {
    const needle = topicQuery.trim().toLowerCase()
    if (!needle) return topics
    return topics.filter((topic) => topic.title.toLowerCase().includes(needle))
  }, [topicQuery, topics])

  const clearTopic = () => {
    if (!activeTopic) return
    void navigate({ to, search: (previous) => ({ ...previous, topic: undefined, page: undefined }) })
  }

  return (
    <div className="list-filters mb-6">
      <Accordion className="list-filter-accordion" defaultValue={activeTopic ? ['topics'] : []}>
        <AccordionItem value="topics">
          <AccordionTrigger className="list-filter-trigger">
            <span className="list-filter-label">
              FILTER BY TOPIC
              {activeTopic ? (
                <span className="list-filter-active">
                  {topics.find((topic) => topic.slug === activeTopic)?.title ?? activeTopic}
                </span>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="list-filter-content">
            <div className="flex flex-col gap-3">
              <div className="list-search">
                <label className="sr-only" htmlFor={`topic-filter-${what}`}>
                  Filter topics
                </label>
                <input
                  autoComplete="off"
                  className="list-search--topics"
                  id={`topic-filter-${what}`}
                  onChange={(event) => setTopicQuery(event.target.value)}
                  placeholder={`Filter topics (${topics.length})…`}
                  type="search"
                  value={topicQuery}
                />
              </div>
              <nav aria-label={`Filter ${what} by topic`} className="flex flex-wrap gap-2">
                <Link
                  aria-current={activeTopic ? undefined : 'true'}
                  className={cn('topic-filter-link', !activeTopic && 'topic-filter-link--active')}
                  search={{ page: undefined }}
                  to={to}
                >
                  All
                </Link>
                {visibleTopics.map((topic) => (
                  <Link
                    aria-current={activeTopic === topic.slug ? 'true' : undefined}
                    className={cn('topic-filter-link', activeTopic === topic.slug && 'topic-filter-link--active')}
                    key={topic.slug}
                    search={{ page: undefined, topic: topic.slug }}
                    to={to}
                  >
                    {topic.title}
                  </Link>
                ))}
                {visibleTopics.length === 0 ? (
                  <span className="topic-filter-empty">No topic matches “{topicQuery.trim()}”.</span>
                ) : null}
              </nav>
              {activeTopic ? (
                <button className="list-filter-clear" onClick={clearTopic} type="button">
                  CLEAR TOPIC FILTER
                </button>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
