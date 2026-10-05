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
      // Width-preserving derivatives for the surfaces that paint an image at its
      // OWN ratio instead of cropping it into a frame: gallery tiles, prose
      // images, and the viewer's hero. Every size above is a fixed-aspect crop,
      // so a square or portrait upload has no uncropped candidate among them and
      // its `srcset` would be empty — the browser would then fetch the original.
      //
      // `fit: 'inside'` scales by width and preserves the aspect, and it is what
      // stops Payload taking its focal-point branch: that branch extracts a
      // fixed-width/fixed-height region, which crops. `withoutEnlargement`
      // keeps a size from being omitted entirely when the upload is narrower
      // than the target, which is Payload's default for a width-only size.
      { name: 'gallerySm', width: 640, fit: 'inside', withoutEnlargement: true },
      { name: 'galleryLg', width: 1280, fit: 'inside', withoutEnlargement: true },
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
