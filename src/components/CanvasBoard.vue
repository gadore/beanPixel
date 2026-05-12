<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '../stores/editor'

const props = defineProps<{
  mode: 'paint' | 'pick'
}>()

const store = useEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isDrawing = ref(false)
const isPanning = ref(false)
const lastPointer = ref({ x: 0, y: 0 })

const cellSize = computed(() => Math.max(8, Math.floor((14 * scale.value * 100) / store.gridWidth) / 100))

function toGridCoordinates(clientX: number, clientY: number) {
  const canvas = canvasRef.value
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const px = clientX - rect.left - offsetX.value
  const py = clientY - rect.top - offsetY.value

  const x = Math.floor(px / cellSize.value)
  const y = Math.floor(py / cellSize.value)

  if (x < 0 || y < 0 || x >= store.gridWidth || y >= store.gridHeight) return null
  return { x, y }
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#0b1020'
  ctx.fillRect(0, 0, width, height)

  const grid = store.activeLayer.grid
  const drawSize = cellSize.value

  ctx.save()
  ctx.translate(offsetX.value, offsetY.value)

  for (let y = 0; y < store.gridHeight; y += 1) {
    for (let x = 0; x < store.gridWidth; x += 1) {
      const colorId = grid[y]?.[x]
      const paletteColor = store.palette.find((item) => item.id === colorId)
      if (!paletteColor) continue

      ctx.fillStyle = paletteColor.hex
      const px = x * drawSize
      const py = y * drawSize
      const radius = Math.max(2, drawSize * 0.2)

      ctx.beginPath()
      ctx.roundRect(px + 1, py + 1, drawSize - 2, drawSize - 2, radius)
      ctx.fill()
    }
  }

  if (store.showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    for (let x = 0; x <= store.gridWidth; x += 1) {
      const px = x * drawSize
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, store.gridHeight * drawSize)
      ctx.stroke()
    }

    for (let y = 0; y <= store.gridHeight; y += 1) {
      const py = y * drawSize
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(store.gridWidth * drawSize, py)
      ctx.stroke()
    }
  }

  ctx.strokeStyle = 'rgba(239,68,68,0.95)'
  ctx.lineWidth = 2
  for (const bead of store.isolatedBeads) {
    ctx.strokeRect(bead.x * drawSize + 1, bead.y * drawSize + 1, drawSize - 2, drawSize - 2)
  }

  ctx.restore()
}

function applyAction(clientX: number, clientY: number) {
  const point = toGridCoordinates(clientX, clientY)
  if (!point) return

  if (props.mode === 'pick') {
    store.pickColorAt(point.x, point.y)
  } else {
    store.paintCell(point.x, point.y)
  }
  draw()
}

function onPointerDown(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.setPointerCapture(event.pointerId)
  lastPointer.value = { x: event.clientX, y: event.clientY }

  if (event.button === 1 || event.shiftKey) {
    isPanning.value = true
    return
  }

  isDrawing.value = true
  applyAction(event.clientX, event.clientY)
}

function onPointerMove(event: PointerEvent) {
  if (isPanning.value) {
    offsetX.value += event.clientX - lastPointer.value.x
    offsetY.value += event.clientY - lastPointer.value.y
    lastPointer.value = { x: event.clientX, y: event.clientY }
    draw()
    return
  }

  if (isDrawing.value && props.mode === 'paint') {
    applyAction(event.clientX, event.clientY)
  }
}

function onPointerUp() {
  isDrawing.value = false
  isPanning.value = false
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const next = event.deltaY > 0 ? scale.value * 0.9 : scale.value * 1.1
  scale.value = Math.min(4, Math.max(0.4, next))
  draw()
}

watch(
  () => [
    store.showGrid,
    store.gridWidth,
    store.gridHeight,
    store.activeLayer.grid,
    store.selectedColorId,
    store.isolatedBeads
  ],
  () => draw(),
  { deep: true }
)

onMounted(() => {
  draw()
})
</script>

<template>
  <div class="relative h-[70vh] min-h-[460px] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
    <canvas
      ref="canvasRef"
      class="h-full w-full touch-none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
    />
    <div class="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-slate-200">
      Zoom {{ Math.round(scale * 100) }}% · Shift+Drag Pan
    </div>
  </div>
</template>
