import type { GridColor, Layer } from '../types'

export function composeVisibleGrid(layers: Layer[], width: number, height: number): GridColor[][] {
  const grid = Array.from({ length: height }, () => Array<GridColor>(width).fill(null))

  for (const layer of layers) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const colorId = layer.grid[y]?.[x]
        if (colorId) {
          grid[y][x] = colorId
        }
      }
    }
  }

  return grid
}
