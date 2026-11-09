// The app's logger and the console writer. Settings come from logger-settings.ts and formatting from
// logger-format.ts, so this file only decides where a line goes. Every log line in the process, including the
// dev tools and Payload's, goes through writeLogLine.
import { formatJson, formatPretty, type LogEntry } from './logger-format.ts'
import { type LogLevel, levelAtLeast, resolveLogSettings } from './logger-settings.ts'
import { sanitizeLogFields } from './redact.ts'

export type { LogLevel } from './logger-settings.ts'

export type LogFields = Record<string, unknown>

export interface Logger {
  debug(message: string, fields?: LogFields): void
  info(message: string, fields?: LogFields): void
  warn(message: string, fields?: LogFields): void
  error(message: string, fields?: LogFields): void
}

// Settings are read on every line, so a change to the environment takes effect without a restart.
export function writeLogLine(level: LogLevel, message: string, fields: LogFields): void {
  const settings = resolveLogSettings(process.env, Boolean(process.stdout.isTTY))
  if (!levelAtLeast(level, settings.level)) return
  const entry: LogEntry = { level, message, fields, time: new Date() }
  console[level](settings.format === 'pretty' ? formatPretty(entry, { color: settings.color }) : formatJson(entry))
}

// This project's one app logger. Its redaction policy (redact.ts) runs on every line before it is written.
export const logger: Logger = {
  debug: (message, fields = {}) => writeLogLine('debug', message, sanitizeLogFields(fields)),
  info: (message, fields = {}) => writeLogLine('info', message, sanitizeLogFields(fields)),
  warn: (message, fields = {}) => writeLogLine('warn', message, sanitizeLogFields(fields)),
  error: (message, fields = {}) => writeLogLine('error', message, sanitizeLogFields(fields)),
}
