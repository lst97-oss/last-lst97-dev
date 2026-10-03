import type { CollectionConfig } from 'payload'

import { authenticatedAccess } from './access'
import { ensureContentSlug } from './hooks/content-slug'

/**
 * Free-form labels that sit alongside the editorial `topics`.
 *
 * A topic is a curated area of the site that owns a listing page; a tag is a
 * small label describing what a single document is. Both are vocabulary rather
 * than content, so neither carries publication or knowledge-indexing hooks.
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: authenticatedAccess,
    update: authenticatedAccess,
    delete: authenticatedAccess,
  },
  hooks: { beforeValidate: [ensureContentSlug] },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: false,
      unique: true,
      index: true,
      admin: { components: { Field: '@/components/payload/slug-field#SlugField' } },
    },
    { name: 'description', type: 'textarea' },
  ],
}
