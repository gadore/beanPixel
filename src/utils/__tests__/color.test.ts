import { describe, expect, it } from 'vitest'
import { deltaE2000, dominantRgbFromImageData, nearestPaletteColor } from '../color'

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

  it('matches published Delta E 2000 reference values', () => {
    expect(
      deltaE2000(
        { l: 50, a: 2.6772, b: -79.7751 },
        { l: 50, a: 0, b: -82.7485 }
      )
    ).toBeCloseTo(2.0425, 4)
  })

  it('extracts the dominant color from noisy source regions', () => {
    const data = new Uint8ClampedArray([
      214, 45, 32, 255,
      214, 45, 32, 255,
      255, 255, 255, 255,
      214, 45, 32, 255
    ])
    const imageData = { data, width: 2, height: 2 } as ImageData

    expect(dominantRgbFromImageData(imageData, 0, 0, 2, 2)).toEqual([214, 45, 32])
  })
})
