import { describe, expect, it } from 'vitest'
import { nearestPaletteColor } from '../color'

const palette = [
  { id: 'RED', name: 'Red', hex: '#ff0000', group: 'basic' },
  { id: 'BLUE', name: 'Blue', hex: '#0000ff', group: 'basic' }
]

describe('nearestPaletteColor', () => {
  it('maps source colors to nearest palette entry', () => {
    expect(nearestPaletteColor('#f23030', palette).id).toBe('RED')
    expect(nearestPaletteColor('#3040ee', palette).id).toBe('BLUE')
  })
})
