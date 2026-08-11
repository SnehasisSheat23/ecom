import { Receiver } from '@upstash/qstash'
import type { MiddlewareHandler } from 'hono'

import { requireEnv } from '../lib/env.js'
import { AppError } from '../lib/errors.js'

let receiver: Receiver | null = null

const getReceiver = (): Receiver => {
  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: requireEnv('QSTASH_CURRENT_SIGNING_KEY'),
      nextSigningKey: requireEnv('QSTASH_NEXT_SIGNING_KEY'),
    })
  }

  return receiver
}

export const qstashAuthMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const signature = c.req.header('upstash-signature')
    if (!signature) {
      throw new AppError('Missing QStash signature', 401, 'unauthorized')
    }

    // Clone the raw request so the route handler can still parse the original body.
    const body = await c.req.raw.clone().text()

    try {
      await getReceiver().verify({
        signature,
        body,
      })
    } catch {
      throw new AppError('Invalid QStash signature', 401, 'unauthorized')
    }

    await next()
  }
}
