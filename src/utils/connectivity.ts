import type { GridColor, BeadCell } from '../types'

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
] as const

export function extractBeads(grid: GridColor[][]): BeadCell[] {
  const beads: BeadCell[] = []
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
      const color = grid[y][x]
      if (color) {
        beads.push({ x, y, color })
      }
    }
  }
  return beads
}

export function findIsolatedBeads(grid: GridColor[][]): BeadCell[] {
  const beads = extractBeads(grid)
  if (beads.length <= 1) {
    return beads
  }

  const beadSet = new Set(beads.map((cell) => `${cell.x},${cell.y}`))
  const visited = new Set<string>()
  const components: BeadCell[][] = []

  for (const bead of beads) {
    const key = `${bead.x},${bead.y}`
    if (visited.has(key)) continue

    const queue: BeadCell[] = [bead]
    const component: BeadCell[] = []
    visited.add(key)

    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)

      for (const [dx, dy] of DIRECTIONS) {
        const nx = current.x + dx
        const ny = current.y + dy
        const nKey = `${nx},${ny}`
        if (!beadSet.has(nKey) || visited.has(nKey)) continue
        visited.add(nKey)
        queue.push({ x: nx, y: ny, color: grid[ny][nx] as string })
      }
    }

    components.push(component)
  }

  const largestSize = Math.max(...components.map((component) => component.length))
  return components
    .filter((component) => component.length < largestSize)
    .flat()
    .sort((a, b) => a.y - b.y || a.x - b.x)
}
