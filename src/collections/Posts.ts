import type { CollectionConfig } from 'payload'

import { authenticatedAccess, publishedAccess } from './access'
import { contentEditor } from './fields/content-editor'
import { seoField } from './fields/seo'
import { ensureContentSlug } from './hooks/content-slug'
import { createKnowledgeAfterChangeHook, createKnowledgeAfterDeleteHook } from '../server/knowledge/payload-hooks'
import { ensurePublicationDate } from './hooks/publication-date'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishedAt', 'updatedAt'],
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
    afterChange: [createKnowledgeAfterChangeHook('post')],
    afterDelete: [createKnowledgeAfterDeleteHook('post')],
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
      name: 'topics',
      type: 'relationship',
      relationTo: 'topics',
      hasMany: true,
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
    seoField(),
  ],
}
