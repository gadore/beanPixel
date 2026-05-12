import type { PaletteColor, PaletteGroup } from '../types'

export const PERLER_PALETTE: PaletteColor[] = [
  // Basic Colors
  { id: 'A13', name: 'Red', hex: '#d62d20', group: 'basic' },
  { id: 'A14', name: 'Orange', hex: '#f28c28', group: 'basic' },
  { id: 'A15', name: 'Yellow', hex: '#f7d038', group: 'basic' },
  { id: 'A16', name: 'Green', hex: '#3cb44b', group: 'basic' },
  { id: 'A17', name: 'Blue', hex: '#2c6bed', group: 'basic' },
  { id: 'A18', name: 'Purple', hex: '#8a4fd4', group: 'basic' },
  { id: 'B02', name: 'White', hex: '#f5f5f5', group: 'basic' },
  { id: 'B03', name: 'Black', hex: '#222222', group: 'basic' },
  { id: 'B04', name: 'Grey', hex: '#a9a9a9', group: 'basic' },
  { id: 'B05', name: 'Brown', hex: '#8b5a2b', group: 'basic' },
  
  // Warm Colors
  { id: 'C01', name: 'Light Pink', hex: '#ffb3d9', group: 'warm' },
  { id: 'C02', name: 'Hot Pink', hex: '#ff69b4', group: 'warm' },
  { id: 'C03', name: 'Dark Red', hex: '#8b0000', group: 'warm' },
  { id: 'C04', name: 'Peach', hex: '#ffdab9', group: 'warm' },
  { id: 'C05', name: 'Light Orange', hex: '#ffcc99', group: 'warm' },
  { id: 'C06', name: 'Gold', hex: '#ffd700', group: 'warm' },
  { id: 'C07', name: 'Cream', hex: '#fffacd', group: 'warm' },
  { id: 'C08', name: 'Tan', hex: '#d2b48c', group: 'warm' },
  
  // Cool Colors
  { id: 'D01', name: 'Light Green', hex: '#90ee90', group: 'cool' },
  { id: 'D02', name: 'Lime', hex: '#32cd32', group: 'cool' },
  { id: 'D03', name: 'Dark Green', hex: '#006400', group: 'cool' },
  { id: 'D04', name: 'Turquoise', hex: '#40e0d0', group: 'cool' },
  { id: 'D05', name: 'Cyan', hex: '#00ffff', group: 'cool' },
  { id: 'D06', name: 'Sky Blue', hex: '#87ceeb', group: 'cool' },
  { id: 'D07', name: 'Dark Blue', hex: '#00008b', group: 'cool' },
  { id: 'D08', name: 'Navy', hex: '#000080', group: 'cool' },
  
  // Purple & Pink
  { id: 'E01', name: 'Lavender', hex: '#e6e6fa', group: 'purple' },
  { id: 'E02', name: 'Light Purple', hex: '#dda0dd', group: 'purple' },
  { id: 'E03', name: 'Violet', hex: '#9400d3', group: 'purple' },
  { id: 'E04', name: 'Magenta', hex: '#ff00ff', group: 'purple' },
  { id: 'E05', name: 'Plum', hex: '#8b008b', group: 'purple' },
  { id: 'E06', name: 'Rose', hex: '#ff007f', group: 'purple' },
  
  // Neutrals
  { id: 'F01', name: 'Light Grey', hex: '#d3d3d3', group: 'neutral' },
  { id: 'F02', name: 'Silver', hex: '#c0c0c0', group: 'neutral' },
  { id: 'F03', name: 'Dark Grey', hex: '#696969', group: 'neutral' },
  { id: 'F04', name: 'Charcoal', hex: '#36454f', group: 'neutral' },
  { id: 'F05', name: 'Beige', hex: '#f5f5dc', group: 'neutral' },
  { id: 'F06', name: 'Ivory', hex: '#fffff0', group: 'neutral' },
  
  // Earth Tones
  { id: 'G01', name: 'Light Brown', hex: '#cd853f', group: 'earth' },
  { id: 'G02', name: 'Chocolate', hex: '#8b4513', group: 'earth' },
  { id: 'G03', name: 'Sand', hex: '#f4a460', group: 'earth' },
  { id: 'G04', name: 'Rust', hex: '#b7410e', group: 'earth' },
  { id: 'G05', name: 'Olive', hex: '#808000', group: 'earth' },
  { id: 'G06', name: 'Khaki', hex: '#c3b091', group: 'earth' },
  
  // Neon/Bright
  { id: 'H01', name: 'Neon Green', hex: '#39ff14', group: 'neon' },
  { id: 'H02', name: 'Neon Yellow', hex: '#ffff00', group: 'neon' },
  { id: 'H03', name: 'Neon Orange', hex: '#ff6600', group: 'neon' },
  { id: 'H04', name: 'Neon Pink', hex: '#ff10f0', group: 'neon' },
  { id: 'H05', name: 'Neon Blue', hex: '#1b03a3', group: 'neon' },
  { id: 'H06', name: 'Electric Purple', hex: '#bf00ff', group: 'neon' }
]

export const PALETTE_GROUPS: PaletteGroup[] = [
  { id: 'all', name: 'All Colors', nameZh: '全部颜色' },
  { id: 'basic', name: 'Basic', nameZh: '基础色' },
  { id: 'warm', name: 'Warm', nameZh: '暖色系' },
  { id: 'cool', name: 'Cool', nameZh: '冷色系' },
  { id: 'purple', name: 'Purple & Pink', nameZh: '紫粉色系' },
  { id: 'neutral', name: 'Neutrals', nameZh: '中性色' },
  { id: 'earth', name: 'Earth Tones', nameZh: '大地色' },
  { id: 'neon', name: 'Neon', nameZh: '荧光色' }
]
