export type BeadSize = '5mm' | '2.6mm'

export type BeadShape = 'round' | 'square'

export type GridColor = string | null

export interface BeadCell {
  x: number
  y: number
  color: string
}

export interface Layer {
  id: string
  name: string
  grid: GridColor[][]
}

export interface PaletteColor {
  id: string
  name: string
  hex: string
  group: string
}

export interface PaletteGroup {
  id: string
  name: string
  nameZh: string
}
