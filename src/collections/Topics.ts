import type { CollectionConfig } from 'payload'
import { authenticatedAccess } from './access'
import { ensureContentSlug } from './hooks/content-slug'

export const Topics: CollectionConfig = {
  slug: 'topics',
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
