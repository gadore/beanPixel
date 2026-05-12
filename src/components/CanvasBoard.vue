<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '../stores/editor'
import { getTextColorForBackground } from '../utils/color-luminance'

const props = defineProps<{
  mode: 'paint' | 'pick'
}>()

const store = useEditorStore()
const { t } = useI18n()
const canvasRef = ref<HTMLCanvasElement | null>(null)

const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const containerW = ref(0)
const containerH = ref(0)
const isDrawing = ref(false)
const isPanning = ref(false)
const lastPointer = ref({ x: 0, y: 0 })
const touchMoved = ref(false)
const longPressTriggered = ref(false)

const LONG_PRESS_PICK_DELAY_MS = 450
const TOUCH_DRAW_START_THRESHOLD_PX = 12

let longPressTimer = 0
let touchStartPoint = { x: 0, y: 0 }
let resizeObserver: ResizeObserver | null = null
let pinchState: {
  distance: number
  centerX: number
  centerY: number
  scale: number
  offsetX: number
  offsetY: number
} | null = null

// Base cell size that fits the grid snugly in the container, multiplied by user zoom scale
const cellSize = computed(() => {
  const w = containerW.value || 700
  const h = containerH.value || 460
  const fitW = w / store.gridWidth
  const fitH = h / store.gridHeight
  const fit = Math.min(fitW, fitH)
  return Math.max(2, fit * scale.value)
})

const canvasWidthPx = computed(() => store.gridWidth * cellSize.value)
const canvasHeightPx = computed(() => store.gridHeight * cellSize.value)

function toGridCoordinates(clientX: number, clientY: number) {
  const canvas = canvasRef.value
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const centerX = (canvas.clientWidth - canvasWidthPx.value) / 2
  const centerY = (canvas.clientHeight - canvasHeightPx.value) / 2
  const px = clientX - rect.left - centerX - offsetX.value
  const py = clientY - rect.top - centerY - offsetY.value

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

  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, width, height)

  const grid = store.activeLayer.grid
  const drawSize = cellSize.value

  ctx.save()
  
  // Center the canvas
  const centerX = (width - canvasWidthPx.value) / 2
  const centerY = (height - canvasHeightPx.value) / 2
  ctx.translate(centerX + offsetX.value, centerY + offsetY.value)

  for (let y = 0; y < store.gridHeight; y += 1) {
    for (let x = 0; x < store.gridWidth; x += 1) {
      const colorId = grid[y]?.[x]
      const paletteColor = store.palette.find((item) => item.id === colorId)
      if (!paletteColor) continue

      ctx.fillStyle = paletteColor.hex
      const px = x * drawSize
      const py = y * drawSize

      if (store.beadShape === 'round') {
        const radius = (drawSize - 2) / 2
        ctx.beginPath()
        ctx.arc(px + drawSize / 2, py + drawSize / 2, radius, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const radius = Math.max(2, drawSize * 0.2)
        ctx.beginPath()
        ctx.roundRect(px + 1, py + 1, drawSize - 2, drawSize - 2, radius)
        ctx.fill()
      }
      
      // Draw bead name if enabled and cell is large enough (threshold: 8px)
      if (store.showBeadNames && drawSize >= 8) {
        ctx.fillStyle = getTextColorForBackground(paletteColor.hex)
        ctx.font = `${Math.max(5, Math.floor(drawSize * 0.4))}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(paletteColor.id, px + drawSize / 2, py + drawSize / 2)
      }
    }
  }

  if (store.showGrid) {
    ctx.strokeStyle = 'rgba(100,116,139,0.3)'
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

function applyAction(clientX: number, clientY: number, mode: 'paint' | 'pick' = props.mode) {
  const point = toGridCoordinates(clientX, clientY)
  if (!point) return

  if (mode === 'pick') {
    store.pickColorAt(point.x, point.y)
  } else {
    store.paintCell(point.x, point.y)
  }
  draw()
}

function clearLongPressTimer() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer)
    longPressTimer = 0
  }
}

function clampScale(next: number) {
  return Math.min(4, Math.max(0.4, next))
}

function getTouchDistance(first: Touch, second: Touch) {
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

function getTouchCenter(first: Touch, second: Touch) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2
  }
}

function startLongPress(clientX: number, clientY: number) {
  clearLongPressTimer()
  longPressTriggered.value = false
  touchStartPoint = { x: clientX, y: clientY }

  longPressTimer = window.setTimeout(() => {
    longPressTriggered.value = true
    applyAction(clientX, clientY, 'pick')
  }, LONG_PRESS_PICK_DELAY_MS)
}

function isTouchPointerEvent(event: PointerEvent) {
  return event.pointerType === 'touch'
}

function onPointerDown(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas || isTouchPointerEvent(event)) return

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
  if (isTouchPointerEvent(event)) return

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
  scale.value = clampScale(next)
  draw()
}

function onTouchStart(event: TouchEvent) {
  event.preventDefault()

  if (event.touches.length >= 2) {
    clearLongPressTimer()
    touchMoved.value = true
    const [first, second] = [event.touches[0], event.touches[1]]
    const center = getTouchCenter(first, second)
    pinchState = {
      distance: getTouchDistance(first, second),
      centerX: center.x,
      centerY: center.y,
      scale: scale.value,
      offsetX: offsetX.value,
      offsetY: offsetY.value
    }
    return
  }

  const touch = event.touches[0]
  if (!touch) return

  touchMoved.value = false
  lastPointer.value = { x: touch.clientX, y: touch.clientY }
  startLongPress(touch.clientX, touch.clientY)
}

function onTouchMove(event: TouchEvent) {
  event.preventDefault()

  if (event.touches.length >= 2 && pinchState) {
    clearLongPressTimer()
    const [first, second] = [event.touches[0], event.touches[1]]
    const center = getTouchCenter(first, second)
    const nextDistance = getTouchDistance(first, second)

    scale.value = clampScale(pinchState.scale * (nextDistance / pinchState.distance))
    offsetX.value = pinchState.offsetX + (center.x - pinchState.centerX)
    offsetY.value = pinchState.offsetY + (center.y - pinchState.centerY)
    draw()
    return
  }

  const touch = event.touches[0]
  if (!touch) return

  const movedDistance = Math.hypot(touch.clientX - touchStartPoint.x, touch.clientY - touchStartPoint.y)
  if (movedDistance > TOUCH_DRAW_START_THRESHOLD_PX) {
    clearLongPressTimer()
    touchMoved.value = true
  }

  if (touchMoved.value && props.mode === 'paint') {
    applyAction(touch.clientX, touch.clientY, 'paint')
  }
}

function onTouchEnd(event: TouchEvent) {
  event.preventDefault()

  if (event.touches.length >= 2) {
    const [first, second] = [event.touches[0], event.touches[1]]
    const center = getTouchCenter(first, second)
    pinchState = {
      distance: getTouchDistance(first, second),
      centerX: center.x,
      centerY: center.y,
      scale: scale.value,
      offsetX: offsetX.value,
      offsetY: offsetY.value
    }
    return
  }

  if (event.touches.length === 1) {
    const touch = event.touches[0]
    pinchState = null
    touchMoved.value = false
    startLongPress(touch.clientX, touch.clientY)
    return
  }

  clearLongPressTimer()
  pinchState = null

  const touch = event.changedTouches[0]
  if (touch && !touchMoved.value && !longPressTriggered.value) {
    applyAction(touch.clientX, touch.clientY)
  }

  touchMoved.value = false
  longPressTriggered.value = false
}

watch(
  () => [
    store.showGrid,
    store.gridWidth,
    store.gridHeight,
    store.activeLayer.grid,
    store.selectedColorId,
    store.isolatedBeads,
    store.beadShape,
    store.showBeadNames,
    scale.value,
    offsetX.value,
    offsetY.value
  ],
  () => draw(),
  { deep: true }
)

// When grid dimensions change, reset zoom and pan so the new content auto-fits
watch(
  () => [store.gridWidth, store.gridHeight],
  () => {
    scale.value = 1
    offsetX.value = 0
    offsetY.value = 0
  }
)

onMounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    containerW.value = canvas.clientWidth
    containerH.value = canvas.clientHeight
    resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        containerW.value = canvas.clientWidth
        containerH.value = canvas.clientHeight
        draw()
      }
    })
    resizeObserver.observe(canvas)
  }
  draw()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="relative h-[70vh] min-h-[460px] w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-50">
    <canvas
      ref="canvasRef"
      class="h-full w-full touch-none"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
    />
    <div class="pointer-events-none absolute bottom-3 right-3 rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-100">
      {{ t('canvasHint', { zoom: Math.round(scale * 100) }) }}
    </div>
  </div>
</template>
