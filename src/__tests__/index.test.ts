import { expect, test } from 'vitest'
import { greet } from '../index'

test('greet returns correct greeting', () => {
  expect(greet('World')).toBe('Hello, World!')
})
