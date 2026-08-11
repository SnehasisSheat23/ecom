import pino from 'pino'
import { getOptionalEnv } from './env.js'

export const logger = pino({
  level: getOptionalEnv('LOG_LEVEL') ?? 'info',
})
