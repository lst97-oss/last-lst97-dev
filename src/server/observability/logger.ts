import { getServerEnv } from '../env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Record<string, unknown>

export interface Logger {
  debug(event: string, fields?: LogFields): void
  info(event: string, fields?: LogFields): void
  warn(event: string, fields?: LogFields): void
  error(event: string, fields?: LogFields): void
}

function serializeError(value: unknown): unknown {
  if (!(value instanceof Error)) {
    return value
  }

  return {
    name: value.name,
  }
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return '[truncated]'
  }
  if (value instanceof Error) {
    return serializeError(value)
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitize(item, depth + 1))
  }
  if (typeof value === 'object' && value !== null) {
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (/password|secret|token|api[-_]?key|authorization|message|content/i.test(key)) {
        output[key] = '[redacted]'
      } else {
        output[key] = sanitize(item, depth + 1)
      }
    }
    return output
  }
  return value
}

export class JsonLogger implements Logger {
  constructor(private readonly minimumLevel: LogLevel = 'info') {}

  debug(event: string, fields?: LogFields): void {
    this.write('debug', event, fields)
  }

  info(event: string, fields?: LogFields): void {
    this.write('info', event, fields)
  }

  warn(event: string, fields?: LogFields): void {
    this.write('warn', event, fields)
  }

  error(event: string, fields?: LogFields): void {
    this.write('error', event, fields)
  }

  private write(level: LogLevel, event: string, fields?: LogFields): void {
    const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
    if (order[level] < order[this.minimumLevel]) {
      return
    }

    const safeFields = sanitize(fields ?? {})
    const fieldRecord =
      typeof safeFields === 'object' && safeFields !== null && !Array.isArray(safeFields) ? safeFields : {}
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...fieldRecord,
    })

    if (level === 'error') {
      console.error(line)
    } else if (level === 'warn') {
      console.warn(line)
    } else {
      console.log(line)
    }
  }
}

export const logger: Logger = new JsonLogger(readLogLevel())

function readLogLevel(): LogLevel {
  return getServerEnv().LOG_LEVEL
}
