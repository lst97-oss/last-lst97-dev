import type { CollectionConfig } from 'payload'

import { publishedAccess } from './access'
import { seoField } from './fields/seo'
import { createKnowledgeAfterChangeHook, createKnowledgeAfterDeleteHook } from '../server/knowledge/payload-hooks'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishedAt', 'updatedAt'],
  },
  access: {
    read: ({ req }) => (req.user ? true : publishedAccess()),
  },
  hooks: {
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
      required: true,
      unique: true,
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
      required: true,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text', required: true }],
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
