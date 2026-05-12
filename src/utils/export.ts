import type { GridColor, Layer, PaletteColor } from '../types'

export interface ExportBomItem extends PaletteColor {
  count: number
}

export interface ExportSheetLabels {
  title: string
  summary: string
  preview: string
  layout: string
  bom: string
  emptyBom: string
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
  includeGuides: boolean
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
      ctx.fillRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize)
      
      // Draw bead name if cell is large enough
      if (cellSize >= 12) {
        const isLightColor = color.hex === '#f5f5f5' || color.hex === '#fffacd' || color.hex === '#fffff0' || 
                             color.hex === '#ffb3d9' || color.hex === '#ffdab9' || color.hex === '#ffcc99' || 
                             color.hex === '#f5f5dc' || color.hex === '#90ee90' || color.hex === '#87ceeb' ||
                             color.hex === '#e6e6fa' || color.hex === '#dda0dd' || color.hex === '#d3d3d3' ||
                             color.hex === '#c0c0c0' || color.hex === '#00ffff' || color.hex === '#40e0d0' ||
                             color.hex === '#ffff00' || color.hex === '#39ff14'
        ctx.fillStyle = isLightColor ? '#000000' : '#ffffff'
        ctx.font = `${Math.max(6, cellSize * 0.35)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(color.id, originX + x * cellSize + cellSize / 2, originY + y * cellSize + cellSize / 2)
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

function drawLayoutAxes(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  originX: number,
  originY: number,
  cellSize: number
) {
  const indexStep = getIndexStep(gridWidth, gridHeight)

  ctx.fillStyle = TEXT_SECONDARY
  ctx.font = '500 12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let x = 0; x < gridWidth; x += indexStep) {
    ctx.fillText(String(x + 1), originX + x * cellSize + cellSize / 2, originY - 12)
  }

  if ((gridWidth - 1) % indexStep !== 0) {
    ctx.fillText(String(gridWidth), originX + (gridWidth - 1) * cellSize + cellSize / 2, originY - 12)
  }

  ctx.textAlign = 'right'
  for (let y = 0; y < gridHeight; y += indexStep) {
    ctx.fillText(String(y + 1), originX - 8, originY + y * cellSize + cellSize / 2)
  }

  if ((gridHeight - 1) % indexStep !== 0) {
    ctx.fillText(String(gridHeight), originX - 8, originY + (gridHeight - 1) * cellSize + cellSize / 2)
  }
}

function drawBom(
  ctx: CanvasRenderingContext2D,
  bom: ExportBomItem[],
  x: number,
  y: number,
  width: number,
  labels: ExportSheetLabels
) {
  drawText(ctx, labels.bom, x, y)

  if (bom.length === 0) {
    drawText(ctx, labels.emptyBom, x, y + 28, TEXT_SECONDARY, '500 14px Inter, system-ui, sans-serif')
    return 54
  }

  const columnWidth = 240
  const columns = Math.max(1, Math.floor(width / columnWidth))
  const rowHeight = 26

  bom.forEach((item, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const itemX = x + column * columnWidth
    const itemY = y + 28 + row * rowHeight

    ctx.fillStyle = item.hex
    ctx.fillRect(itemX, itemY - 12, 14, 14)
    ctx.strokeStyle = GRID_LINE_STRONG
    ctx.strokeRect(itemX, itemY - 12, 14, 14)

    drawText(
      ctx,
      `${item.id} · ${item.name} × ${item.count}`,
      itemX + 24,
      itemY,
      TEXT_PRIMARY,
      '500 14px Inter, system-ui, sans-serif'
    )
  })

  return 28 + Math.ceil(bom.length / columns) * rowHeight
}

export function createExportSheetCanvas(options: ExportSheetOptions) {
  const grid = composeVisibleGrid(options.layers, options.gridWidth, options.gridHeight)
  const paletteMap = new Map(options.palette.map((item) => [item.id, item]))
  const cellSize = getCellSize(options.gridWidth, options.gridHeight)
  const gridWidthPx = options.gridWidth * cellSize
  const gridHeightPx = options.gridHeight * cellSize
  const axisOffset = 28
  const padding = 28
  const gap = 22
  const panelWidth = Math.max(gridWidthPx, gridWidthPx + axisOffset)
  const bomColumns = Math.max(1, Math.floor(panelWidth / 240))
  const bomRows = Math.ceil(Math.max(options.bom.length, 1) / bomColumns)
  const headerHeight = 74
  const previewPanelHeight = gridHeightPx + 54
  const layoutPanelHeight = gridHeightPx + axisOffset + 54
  const bomHeight = Math.max(86, 52 + bomRows * 26)
  const canvasWidth = padding * 2 + Math.max(panelWidth, 720)
  const canvasHeight =
    padding * 2 + headerHeight + previewPanelHeight + gap + layoutPanelHeight + gap + bomHeight

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.textBaseline = 'alphabetic'

  drawText(ctx, options.labels.title, padding, padding + 22, TEXT_PRIMARY, '700 28px Inter, system-ui, sans-serif')
  const summary = `${options.labels.summary}: ${options.gridWidth}×${options.gridHeight} · ${options.beadSize} · ${options.totalBeads}`
  drawWrappedText(ctx, summary, padding, padding + 48, canvasWidth - padding * 2, 18)

  let sectionTop = padding + headerHeight

  drawRoundedPanel(ctx, padding, sectionTop, canvasWidth - padding * 2, previewPanelHeight)
  drawText(ctx, options.labels.preview, padding + 18, sectionTop + 30)
  drawGrid(ctx, grid, paletteMap, padding + 18, sectionTop + 42, cellSize, options.includeGuides)

  sectionTop += previewPanelHeight + gap

  drawRoundedPanel(ctx, padding, sectionTop, canvasWidth - padding * 2, layoutPanelHeight)
  drawText(ctx, options.labels.layout, padding + 18, sectionTop + 30)
  const layoutOriginX = padding + 18 + axisOffset
  const layoutOriginY = sectionTop + 42 + axisOffset
  drawGrid(ctx, grid, paletteMap, layoutOriginX, layoutOriginY, cellSize, options.includeGuides)
  drawLayoutAxes(ctx, options.gridWidth, options.gridHeight, layoutOriginX, layoutOriginY, cellSize)

  sectionTop += layoutPanelHeight + gap

  drawRoundedPanel(ctx, padding, sectionTop, canvasWidth - padding * 2, bomHeight)
  drawBom(ctx, options.bom, padding + 18, sectionTop + 30, canvasWidth - padding * 2 - 36, options.labels)

  return canvas
}
