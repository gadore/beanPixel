import { describe, expect, it } from 'vitest'
import { findIsolatedBeads } from '../connectivity'

describe('findIsolatedBeads', () => {
  it('returns empty when all beads connected', () => {
    const grid = [
      ['A13', 'A13', null],
      [null, 'A13', null],
      [null, null, null]
    ]

    expect(findIsolatedBeads(grid)).toEqual([])
  })

  it('flags disconnected components smaller than the largest component', () => {
    const grid = [
      ['A13', 'A13', null, null],
      [null, 'A13', null, 'B03'],
      [null, null, null, null],
      [null, null, null, 'B03']
    ]

    expect(findIsolatedBeads(grid)).toEqual([
      { x: 3, y: 1, color: 'B03' },
      { x: 3, y: 3, color: 'B03' }
    ])
  })
})
