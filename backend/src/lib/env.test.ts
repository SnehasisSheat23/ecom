import { afterEach, describe, expect, it } from 'vitest'

import {
  getOptionalEnv,
  initializeEnvSource,
  requireEnv,
  resetEnvSourceForTests,
} from './env.js'

describe('env', () => {
  afterEach(() => {
    resetEnvSourceForTests()
    delete process.env.TEST_ENV_VALUE
  })

  it('reads values from the initialized env source', () => {
    initializeEnvSource({ TEST_ENV_VALUE: 'worker-value' })

    expect(getOptionalEnv('TEST_ENV_VALUE')).toBe('worker-value')
    expect(requireEnv('TEST_ENV_VALUE')).toBe('worker-value')
  })

  it('allows repeated initialization with the same values', () => {
    initializeEnvSource({ TEST_ENV_VALUE: 'worker-value' })

    expect(() => initializeEnvSource({ TEST_ENV_VALUE: 'worker-value' })).not.toThrow()
  })

  it('rejects attempts to overwrite the initialized env source', () => {
    initializeEnvSource({ TEST_ENV_VALUE: 'worker-value' })

    expect(() => initializeEnvSource({ TEST_ENV_VALUE: 'different-value' })).toThrow(
      /Environment source was already initialized/,
    )
  })

  it('falls back to process.env when no worker env was initialized', () => {
    process.env.TEST_ENV_VALUE = 'process-value'

    expect(getOptionalEnv('TEST_ENV_VALUE')).toBe('process-value')
  })
})
