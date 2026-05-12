import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { PERLER_PALETTE } from '../constants/palette'
import type { BeadSize, GridColor, Layer } from '../types'
import { findIsolatedBeads } from '../utils/connectivity'

const BEAD_MM: Record<BeadSize, number> = {
  '5mm': 5,
  '2.6mm': 2.6
}

function createGrid(width: number, height: number, fill: GridColor = null): GridColor[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill))
}

function createLayer(name: string, width: number, height: number): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    grid: createGrid(width, height)
  }
}

export const useEditorStore = defineStore('editor', () => {
  const gridWidth = ref(48)
  const gridHeight = ref(48)
  const beadSize = ref<BeadSize>('5mm')
  const showGrid = ref(true)
  const palette = ref(PERLER_PALETTE)
  const selectedColorId = ref(palette.value[0].id)
  const layers = ref<Layer[]>([createLayer('Layer 1', gridWidth.value, gridHeight.value)])
  const activeLayerId = ref(layers.value[0].id)

  const activeLayer = computed(
    () => layers.value.find((layer) => layer.id === activeLayerId.value) ?? layers.value[0]
  )

  const selectedColor = computed(
    () => palette.value.find((color) => color.id === selectedColorId.value) ?? palette.value[0]
  )

  const isolatedBeads = computed(() => findIsolatedBeads(activeLayer.value.grid))

  const physicalSizeCm = computed(() => {
    const mm = BEAD_MM[beadSize.value]
    return {
      width: Number(((gridWidth.value * mm) / 10).toFixed(2)),
      height: Number(((gridHeight.value * mm) / 10).toFixed(2))
    }
  })

  const bom = computed(() => {
    const usage = new Map<string, number>()
    for (const layer of layers.value) {
      for (const row of layer.grid) {
        for (const cell of row) {
          if (!cell) continue
          usage.set(cell, (usage.get(cell) ?? 0) + 1)
        }
      }
    }

    return palette.value
      .map((color) => ({ ...color, count: usage.get(color.id) ?? 0 }))
      .filter((color) => color.count > 0)
      .sort((a, b) => b.count - a.count)
  })

  const totalBeads = computed(() => bom.value.reduce((sum, item) => sum + item.count, 0))

  function selectColor(colorId: string) {
    selectedColorId.value = colorId
  }

  function pickColorAt(x: number, y: number) {
    const colorId = activeLayer.value.grid[y]?.[x]
    if (colorId) {
      selectedColorId.value = colorId
    }
  }

  function paintCell(x: number, y: number, colorId: string | null = selectedColor.value.id) {
    if (x < 0 || y < 0 || x >= gridWidth.value || y >= gridHeight.value) return
    activeLayer.value.grid[y][x] = colorId
  }

  function clearCanvas() {
    for (const layer of layers.value) {
      layer.grid = createGrid(gridWidth.value, gridHeight.value)
    }
  }

  function setDensity(width: number, height: number) {
    const safeWidth = Math.max(8, Math.min(256, Math.floor(width)))
    const safeHeight = Math.max(8, Math.min(256, Math.floor(height)))

    gridWidth.value = safeWidth
    gridHeight.value = safeHeight

    layers.value = layers.value.map((layer) => {
      const next = createGrid(safeWidth, safeHeight)
      for (let y = 0; y < Math.min(layer.grid.length, safeHeight); y += 1) {
        for (let x = 0; x < Math.min(layer.grid[y].length, safeWidth); x += 1) {
          next[y][x] = layer.grid[y][x]
        }
      }
      return { ...layer, grid: next }
    })
  }

  function addLayer() {
    const layer = createLayer(`Layer ${layers.value.length + 1}`, gridWidth.value, gridHeight.value)
    layers.value.push(layer)
    activeLayerId.value = layer.id
  }

  function removeLayer(layerId: string) {
    if (layers.value.length === 1) return
    layers.value = layers.value.filter((layer) => layer.id !== layerId)
    if (!layers.value.some((layer) => layer.id === activeLayerId.value)) {
      activeLayerId.value = layers.value[0].id
    }
  }

  return {
    beadSize,
    showGrid,
    palette,
    selectedColorId,
    selectedColor,
    gridWidth,
    gridHeight,
    layers,
    activeLayer,
    activeLayerId,
    isolatedBeads,
    physicalSizeCm,
    bom,
    totalBeads,
    selectColor,
    pickColorAt,
    paintCell,
    clearCanvas,
    setDensity,
    addLayer,
    removeLayer
  }
})
