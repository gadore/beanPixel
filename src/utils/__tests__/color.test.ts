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

  it('avoids collapsing muted pinks into neutral greys', () => {
    const skinPalette = [
      { id: 'GREY', name: 'Grey', hex: '#a9a9a9', group: 'neutral' },
      { id: 'SILVER', name: 'Silver', hex: '#c0c0c0', group: 'neutral' },
      { id: 'PINK', name: 'Pink', hex: '#ffb3d9', group: 'warm' },
      { id: 'PEACH', name: 'Peach', hex: '#ffdab9', group: 'warm' },
      { id: 'TAN', name: 'Tan', hex: '#d2b48c', group: 'warm' }
    ]

    expect(nearestPaletteColor('#c8b1b1', skinPalette).id).not.toBe('GREY')
    expect(nearestPaletteColor('#c8b1b1', skinPalette).id).not.toBe('SILVER')
  })
})
