import type { CollectionConfig } from 'payload'
import { authenticatedAccess } from './access'
import { ensureVersionedMediaFilename } from './hooks/versioned-media-filename'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: authenticatedAccess,
    update: authenticatedAccess,
    delete: authenticatedAccess,
  },
  admin: {
    useAsTitle: 'alt',
  },
  upload: {
    mimeTypes: ['image/*'],
    adminThumbnail: 'thumbnail',
    crop: true,
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 240, position: 'centre' },
      { name: 'card', width: 768, height: 432, position: 'centre' },
      { name: 'hero', width: 1600, height: 900, position: 'centre' },
    ],
  },
  hooks: {
    beforeChange: [ensureVersionedMediaFilename],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
