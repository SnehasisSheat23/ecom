export type EnvSource = Record<string, any>

let envSource: Readonly<EnvSource> | undefined

/**
 * Initializes the source for environment variables.
 * In Cloudflare Workers, this should be called once with the `env` object passed to the fetch handler.
 */
export const initializeEnvSource = (source: EnvSource) => {
  if (!envSource) {
    envSource = Object.freeze({ ...source })
    return
  }

  for (const [key, value] of Object.entries(source)) {
    if (envSource[key] !== value) {
      throw new Error(`Environment source was already initialized and cannot be changed: ${key}`)
    }
  }
}

export const resetEnvSourceForTests = () => {
  envSource = undefined
}

export const getOptionalEnv = (name: string): string | undefined => {
  const valueFromSource = envSource?.[name]
  
  // Safe access to process.env if available (Node.js or with nodejs_compat)
  const valueFromProcess = typeof process !== 'undefined' && process.env 
    ? process.env[name] 
    : undefined

  const value = (valueFromSource || valueFromProcess)?.trim()
  return value ? value : undefined
}

export const requireEnv = (name: string): string => {
  const value = getOptionalEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
