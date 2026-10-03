import { z } from 'zod'

/**
 * Wire contract for `POST /api/site/contact` responses.
 *
 * `http-handler.ts` cannot hold this: it imports `../http/request` and the
 * server `Logger`, neither of which may reach the client module graph. This is
 * the contact-side counterpart to `src/server/chat/events.ts`, and the browser
 * form parses the error body with it instead of casting.
 *
 * Permissive rather than strict: the handler adds `requestId` to every body and
 * may add more, and an older client must still read the message it displays.
 * `fields` is the per-field issue list the handler already returns for a 400;
 * parsing it is what makes the shape usable without a cast.
 */
export const contactResponseSchema = z.looseObject({
  accepted: z.boolean().optional(),
  error: z.string().optional(),
  fields: z.array(z.string()).optional(),
})

export type ContactResponse = z.infer<typeof contactResponseSchema>
