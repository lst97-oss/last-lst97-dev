import type { SQL } from 'drizzle-orm'

import type { KnowledgeDatabase, KnowledgeExecutor } from './types'

interface DrizzleExecutor {
  execute(query: SQL): Promise<unknown[]>
}

interface DrizzleDatabase extends DrizzleExecutor {
  transaction<T>(callback: (transaction: DrizzleExecutor) => Promise<T>): Promise<T>
}

function createExecutor(executor: DrizzleExecutor): KnowledgeExecutor {
  return {
    async execute(query) {
      // `drizzle-orm/bun-sql` resolves `db.execute()` to the rows array, not a
      // node-postgres result object. The repository port stays `{ rows }` so
      // the SQL operations and their fakes do not depend on the driver shape.
      return { rows: await executor.execute(query) }
    },
  }
}

export function createKnowledgeDatabase(database: DrizzleDatabase): KnowledgeDatabase {
  return {
    ...createExecutor(database),
    transaction(callback) {
      return database.transaction((transaction) => callback(createExecutor(transaction)))
    },
  }
}
