import { expect, test } from 'vitest'
import { greet, toGeojson } from '../index'

test('greet returns correct greeting', () => {
  expect(greet('World')).toBe('Hello, World!')
})

test('toGeojson fails if no path given', () => {
  expect(toGeojson('')).toBe({})
})
