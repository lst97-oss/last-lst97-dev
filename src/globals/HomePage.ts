import type { GlobalConfig } from 'payload'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'featuredPost',
      type: 'relationship',
      relationTo: 'posts',
      filterOptions: {
        status: { equals: 'published' },
      },
    },
  ],
}
