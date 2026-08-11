import { describe, expect, it } from 'vitest'
import { slugify } from './slug.js'

describe('slugify', () => {
  it('converts strings to lowercase url-friendly slugs', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces ampersands with "and"', () => {
    expect(slugify('Electronics & Gadgets')).toBe('electronics-and-gadgets')
  })

  it('removes special characters and trims whitespace', () => {
    expect(slugify('  Camera & Lens (Pro Edition)!  ')).toBe('camera-and-lens-pro-edition')
  })

  it('collapses multiple hyphens or underscores into a single hyphen', () => {
    expect(slugify('foo---bar___baz')).toBe('foo-bar-baz')
  })

  it('handles empty or special character only strings', () => {
    expect(slugify('!!!')).toBe('')
  })
})
