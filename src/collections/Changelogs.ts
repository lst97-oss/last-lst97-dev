import type { CollectionConfig } from 'payload'

import { publishedAccess } from './access'
import { seoField } from './fields/seo'

export const Changelogs: CollectionConfig = {
  slug: 'changelogs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'status', 'publishedAt', 'updatedAt'],
  },
  access: {
    read: ({ req }) => (req.user ? true : publishedAccess()),
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
