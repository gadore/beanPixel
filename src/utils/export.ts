import type { BeadShape, GridColor, Layer, PaletteColor } from '../types'
import { getTextColorForBackground } from './color-luminance'

export interface ExportBomItem extends PaletteColor {
  count: number
}

export interface ExportSheetLabels {
  title: string
  summary: string
  preview: string
}

export interface ExportSheetOptions {
  gridWidth: number
  gridHeight: number
  layers: Layer[]
  palette: PaletteColor[]
  bom: ExportBomItem[]
  beadSize: string
  totalBeads: number
  includeGuides: boolean
  beadShape: BeadShape
  labels: ExportSheetLabels
}

const BACKGROUND = '#f8fafc'
const PANEL_BACKGROUND = '#ffffff'
const PANEL_BORDER = '#cbd5e1'
const TEXT_PRIMARY = '#0f172a'
const TEXT_SECONDARY = '#64748b'
const GRID_LINE = 'rgba(100, 116, 139, 0.18)'
const GRID_LINE_STRONG = 'rgba(100, 116, 139, 0.45)'
const EMPTY_CELL = '#ffffff'

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getCellSize(gridWidth: number, gridHeight: number) {
  return clamp(Math.floor(960 / Math.max(gridWidth, gridHeight)), 4, 18)
}

function getIndexStep(gridWidth: number, gridHeight: number) {
  const largest = Math.max(gridWidth, gridHeight)
  if (largest <= 24) return 1
  if (largest <= 72) return 4
  if (largest <= 128) return 8
  return 16
}

function drawRoundedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.fillStyle = PANEL_BACKGROUND
  ctx.strokeStyle = PANEL_BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 18)
  ctx.fill()
  ctx.stroke()
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillStyle = TEXT_PRIMARY,
  font = '600 18px Inter, system-ui, sans-serif'
) {
  ctx.fillStyle = fillStyle
  ctx.font = font
  ctx.textAlign = 'left'
  ctx.fillText(text, x, y)
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fillStyle = TEXT_SECONDARY,
  font = '500 14px Inter, system-ui, sans-serif'
) {
  ctx.fillStyle = fillStyle
  ctx.font = font
  ctx.textAlign = 'left'

  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate
      continue
    }

    lines.push(currentLine)
    currentLine = word
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })

  return lines.length
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: GridColor[][],
  paletteMap: Map<string, PaletteColor>,
  originX: number,
  originY: number,
  cellSize: number,
  includeGuides: boolean,
  beadShape: BeadShape = 'square'
) {
  const gridHeight = grid.length
  const gridWidth = grid[0]?.length ?? 0
  const indexStep = getIndexStep(gridWidth, gridHeight)

  ctx.fillStyle = EMPTY_CELL
  ctx.fillRect(originX, originY, gridWidth * cellSize, gridHeight * cellSize)

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const colorId = grid[y]?.[x]
      if (!colorId) continue

      const color = paletteMap.get(colorId)
      if (!color) continue

      ctx.fillStyle = color.hex

      const px = originX + x * cellSize
      const py = originY + y * cellSize

      if (beadShape === 'round') {
        const radius = (cellSize - 2) / 2
        ctx.beginPath()
        ctx.arc(px + cellSize / 2, py + cellSize / 2, radius, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const radius = Math.max(2, cellSize * 0.15)
        ctx.beginPath()
        ctx.roundRect(px + 1, py + 1, cellSize - 2, cellSize - 2, radius)
        ctx.fill()
      }

      // Draw bead name if cell is large enough (threshold: 12px)
      if (cellSize >= 12) {
        ctx.fillStyle = getTextColorForBackground(color.hex)
        ctx.font = `${Math.max(6, cellSize * 0.35)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(color.id, px + cellSize / 2, py + cellSize / 2)
        ctx.textBaseline = 'alphabetic'
      }
    }
  }

  if (!includeGuides) return

  for (let x = 0; x <= gridWidth; x += 1) {
    ctx.beginPath()
    ctx.strokeStyle = x % indexStep === 0 ? GRID_LINE_STRONG : GRID_LINE
    ctx.moveTo(originX + x * cellSize, originY)
    ctx.lineTo(originX + x * cellSize, originY + gridHeight * cellSize)
    ctx.stroke()
  }

  for (let y = 0; y <= gridHeight; y += 1) {
    ctx.beginPath()
    ctx.strokeStyle = y % indexStep === 0 ? GRID_LINE_STRONG : GRID_LINE
    ctx.moveTo(originX, originY + y * cellSize)
    ctx.lineTo(originX + gridWidth * cellSize, originY + y * cellSize)
    ctx.stroke()
  }
}

export function createExportSheetCanvas(options: ExportSheetOptions) {
  const grid = composeVisibleGrid(options.layers, options.gridWidth, options.gridHeight)
  const paletteMap = new Map(options.palette.map((item) => [item.id, item]))
  const cellSize = getCellSize(options.gridWidth, options.gridHeight)
  const gridWidthPx = options.gridWidth * cellSize
  const gridHeightPx = options.gridHeight * cellSize
  const padding = 28
  const headerHeight = 64
  const panelInner = 18

  // Canvas content width (panel inner area width)
  const contentWidth = Math.max(gridWidthPx, 720)
  const canvasWidth = padding * 2 + contentWidth

  // BOM section
  const bomItemHeight = 26
  const bomColumns = 3
  const bomRowCount = Math.ceil(options.bom.length / bomColumns)
  const bomSectionHeight = options.bom.length > 0
    ? panelInner + 24 + 8 + bomRowCount * bomItemHeight + panelInner
    : 0

  // Preview panel uses clamped grid width so grid never overflows
  const previewPanelHeight = panelInner + 22 + 8 + gridHeightPx + panelInner

  const canvasHeight = padding * 2 + headerHeight + previewPanelHeight + (options.bom.length > 0 ? 12 : 0) + bomSectionHeight

  const canvas = document.createElement('canvas')
  const dpr = typeof window !== 'undefined' ? Math.max(2, window.devicePixelRatio || 2) : 2
  canvas.width = canvasWidth * dpr
  canvas.height = canvasHeight * dpr
  canvas.style.width = `${canvasWidth}px`
  canvas.style.height = `${canvasHeight}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.scale(dpr, dpr)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Header
  drawText(ctx, options.labels.title, padding, padding + 22, TEXT_PRIMARY, '700 28px Inter, system-ui, sans-serif')
  const summary = `${options.labels.summary}: ${options.gridWidth}×${options.gridHeight} · ${options.beadSize} · ${options.totalBeads}`
  drawWrappedText(ctx, summary, padding, padding + 48, canvasWidth - padding * 2, 18)

  // Preview panel
  const sectionTop = padding + headerHeight
  drawRoundedPanel(ctx, padding, sectionTop, canvasWidth - padding * 2, previewPanelHeight)
  drawText(ctx, options.labels.preview, padding + panelInner, sectionTop + 26)

  // Clip grid drawing to panel inner area so it never overflows the border
  const gridOriginX = padding + panelInner
  const gridOriginY = sectionTop + panelInner + 22 + 8
  const panelInnerWidth = contentWidth - panelInner * 2

  ctx.save()
  ctx.beginPath()
  ctx.rect(gridOriginX, gridOriginY, panelInnerWidth, gridHeightPx)
  ctx.clip()

  // Scale grid horizontally if it's wider than the available space
  if (gridWidthPx > panelInnerWidth) {
    const scaleX = panelInnerWidth / gridWidthPx
    ctx.save()
    ctx.scale(scaleX, 1)
    drawGrid(ctx, grid, paletteMap, gridOriginX / scaleX, gridOriginY, cellSize, options.includeGuides, options.beadShape)
    ctx.restore()
  } else {
    drawGrid(ctx, grid, paletteMap, gridOriginX, gridOriginY, cellSize, options.includeGuides, options.beadShape)
  }
  ctx.restore()

  // BOM section
  if (options.bom.length > 0) {
    const bomTop = sectionTop + previewPanelHeight + 12
    drawRoundedPanel(ctx, padding, bomTop, canvasWidth - padding * 2, bomSectionHeight)
    drawText(ctx, options.labels.summary + ' BOM', padding + panelInner, bomTop + 26)

    const colWidth = (contentWidth - panelInner * 2) / bomColumns
    options.bom.forEach((item, index) => {
      const col = index % bomColumns
      const row = Math.floor(index / bomColumns)
      const itemX = padding + panelInner + col * colWidth
      const itemY = bomTop + panelInner + 24 + 8 + row * bomItemHeight

      // Color swatch
      const swatchSize = 16
      ctx.fillStyle = item.hex
      ctx.beginPath()
      ctx.arc(itemX + swatchSize / 2, itemY - swatchSize / 2 + 2, swatchSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = PANEL_BORDER
      ctx.lineWidth = 1
      ctx.stroke()

      // ID + name + count
      const textX = itemX + swatchSize + 6
      ctx.fillStyle = TEXT_PRIMARY
      ctx.font = '600 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(item.id, textX, itemY)

      ctx.fillStyle = TEXT_SECONDARY
      ctx.font = '400 11px Inter, system-ui, sans-serif'
      const nameMaxWidth = colWidth - swatchSize - 6 - 36
      const name = ctx.measureText(item.name).width > nameMaxWidth
        ? item.name.slice(0, Math.floor(item.name.length * nameMaxWidth / ctx.measureText(item.name).width) - 1) + '…'
        : item.name
      ctx.fillText(name, textX + 34, itemY)

      ctx.fillStyle = TEXT_PRIMARY
      ctx.font = '600 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`×${item.count}`, itemX + colWidth - 4, itemY)
      ctx.textAlign = 'left'
    })
  }

  return canvas
}

