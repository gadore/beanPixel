import { describe, expect, it } from 'vitest'
import { composeVisibleGrid, getBomColumnCount } from '../export'

describe('composeVisibleGrid', () => {
  it('keeps lower layer colors when upper layers are empty', () => {
    const layers = [
      {
        id: 'layer-1',
        name: 'Layer 1',
        grid: [
          ['A01', null],
          [null, 'B02']
        ]
      },
      {
        id: 'layer-2',
        name: 'Layer 2',
        grid: [
          [null, 'C03'],
          [null, null]
        ]
      }
    ]

    expect(composeVisibleGrid(layers, 2, 2)).toEqual([
      ['A01', 'C03'],
      [null, 'B02']
    ])
  })

  it('lets later layers override lower layer cells', () => {
    const layers = [
      {
        id: 'layer-1',
        name: 'Layer 1',
        grid: [['A01']]
      },
      {
        id: 'layer-2',
        name: 'Layer 2',
        grid: [['B02']]
      }
    ]

    expect(composeVisibleGrid(layers, 1, 1)).toEqual([['B02']])
  })

  it('calculates BOM column count from available content width', () => {
    expect(getBomColumnCount(720)).toBe(5)
    expect(getBomColumnCount(360)).toBe(3)
  })
})
