import type { GroupField } from 'payload'

export function seoField(): GroupField {
  return {
    name: 'seo',
    type: 'group',
    fields: [
      {
        name: 'title',
        type: 'text',
      },
      {
        name: 'description',
        type: 'textarea',
      },
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
      },
    ],
  }
}
