import type { CollectionConfig } from 'payload'
import { createKnowledgeAfterChangeHook, createKnowledgeAfterDeleteHook } from '../server/knowledge/payload-hooks'
import { authenticatedAccess, publishedAccess } from './access'
import { contentEditor } from './fields/content-editor'
import { seoField } from './fields/seo'
import { ensureContentSlug } from './hooks/content-slug'
import { ensurePublicationDate } from './hooks/publication-date'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'projectStatus', 'featured', 'sortOrder'],
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
    afterChange: [createKnowledgeAfterChangeHook('project')],
    afterDelete: [createKnowledgeAfterDeleteHook('project')],
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
      name: 'summary',
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
      admin: {
        description:
          'Use Markdown shortcuts for headings, lists, tables, and fenced code. Insert images through the Media upload control.',
      },
    },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      // One multi-select picker: choose or drop as many images as needed, then
      // drag to reorder. There is no per-image caption field — the media
      // document's own `alt` (required in the Media collection) is what the
      // gallery and the viewer show, so the text is written once at upload.
      admin: {
        description:
          'Screenshots and photos. Add as many as you like, then drag to reorder. The caption shown in the viewer is the image’s alt text.',
      },
    },
    {
      name: 'technologies',
      type: 'array',
      fields: [{ name: 'technology', type: 'text', required: true }],
    },
    {
      name: 'topics',
      type: 'relationship',
      relationTo: 'topics',
      hasMany: true,
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
    {
      name: 'role',
      type: 'text',
    },
    {
      name: 'projectStatus',
      type: 'select',
      options: [
        { label: 'Planned', value: 'planned' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'repositoryUrl',
      type: 'text',
    },
    {
      name: 'liveUrl',
      type: 'text',
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
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      index: true,
    },
    seoField(),
  ],
}
