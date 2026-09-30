import type { CollectionConfig } from 'payload'

import { authenticatedAccess, publishedAccess } from './access'
import { contentEditor } from './fields/content-editor'
import { seoField } from './fields/seo'
import { ensureContentSlug } from './hooks/content-slug'
import { ensurePublicationDate } from './hooks/publication-date'

export const Changelogs: CollectionConfig = {
  slug: 'changelogs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'status', 'publishedAt', 'updatedAt'],
  },
  access: {
    read: ({ req }) => (req.user ? true : publishedAccess()),
    create: authenticatedAccess,
    update: authenticatedAccess,
    delete: authenticatedAccess,
  },
  hooks: {
    beforeValidate: [ensureContentSlug],
    beforeChange: [ensurePublicationDate],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: false,
      unique: true,
      index: true,
      admin: { components: { Field: '@/components/payload/slug-field#SlugField' } },
    },
    {
      name: 'version',
      type: 'text',
      admin: {
        description: 'Release label shown on the timeline, e.g. v1.4.0.',
      },
      index: true,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
      editor: contentEditor,
      required: true,
      admin: { description: 'Use Markdown shortcuts for headings, lists, tables, and fenced code. Insert images through the Media upload control.' },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text', required: true }],
    },
    {
      name: 'changeTypes',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Feature', value: 'feature' },
        { label: 'Improvement', value: 'improvement' },
        { label: 'Bug fix', value: 'bug_fix' },
        { label: 'Security', value: 'security' },
        { label: 'Breaking change', value: 'breaking_change' },
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'Documentation', value: 'documentation' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      required: true,
      index: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
      index: true,
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
    seoField(),
  ],
}
