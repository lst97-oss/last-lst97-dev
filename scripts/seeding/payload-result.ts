/**
 * The local API's `update` overload returns `BulkOperationResult | Doc` even
 * when given a single by-ID document. Every seeding script passes exactly one
 * document, so narrow the result back to that document before reading fields.
 */
export function savedDocument<T>(result: T | { docs: T[] }): T {
  if (typeof result === 'object' && result !== null && 'docs' in result) {
    const { docs } = result as { docs?: T[] }
    if (Array.isArray(docs) && docs.length > 0) return docs[0] as T
  }
  return result as T
}
