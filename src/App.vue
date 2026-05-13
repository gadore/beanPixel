<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CanvasBoard from './components/CanvasBoard.vue'
import ThreePreview from './components/ThreePreview.vue'
import type { BeadShape, BeadSize, ToolMode } from './types'
import { useEditorStore } from './stores/editor'
import { PALETTE_GROUPS } from './constants/palette'
import { nearestPaletteColor } from './utils/color'
import { createExportSheetCanvas } from './utils/export'

const store = useEditorStore()
const { t, locale } = useI18n()

const mode = ref<ToolMode>('paint')
const exportIncludeGuides = ref(true)
const workspaceTab = ref(0) // 0 = 2D Canvas, 1 = 3D Preview
const topSidebarTab = ref(0)    // 0 = Controls, 1 = Palette, 2 = Shortcuts
const bottomSidebarTab = ref(0) // 0 = BOM, 1 = Layers

const densityWidth = ref(store.gridWidth)
const densityHeight = ref(store.gridHeight)
const showCustomSize = ref(false)

// Retains the decoded image element after import so we can re-pixelate at new resolutions.
// The blob URL is revoked immediately after load; the img element itself holds the pixel data.
const uploadedImage = ref<HTMLImageElement | null>(null)

const beadOptions: BeadSize[] = ['5mm', '2.6mm']
const beadShapeOptions: BeadShape[] = ['square', 'round']
const languageOptions = ['zh', 'en'] as const
const presetSizes = [
  { width: 48, height: 48 },
  { width: 64, height: 64 },
  { width: 96, height: 96 },
  { width: 128, height: 128 }
]

const paletteGroups = computed(() => PALETTE_GROUPS.map(g => ({
  ...g,
  displayName: locale.value === 'zh' ? g.nameZh : g.name
})))

const shortcutItems = computed(() => [
  { key: 'B', description: t('shortcutPaint') },
  { key: 'I', description: t('shortcutPick') },
  { key: 'R', description: t('shortcutErase') },
  { key: 'G', description: t('shortcutToggleGrid') },
  { key: 'Ctrl+Z', description: t('shortcutUndo') },
  { key: 'Shift+L', description: t('shortcutAddLayer') },
  { key: 'Shift+C', description: t('shortcutClear') },
  { key: 'E', description: t('shortcutExport') }
])

async function pixelateImageToGrid(img: HTMLImageElement) {
  const offscreen = document.createElement('canvas')
  offscreen.width = store.gridWidth
  offscreen.height = store.gridHeight
  const ctx = offscreen.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  ctx.drawImage(img, 0, 0, store.gridWidth, store.gridHeight)
  const imageData = ctx.getImageData(0, 0, store.gridWidth, store.gridHeight)

  store.clearCanvas()

  for (let y = 0; y < store.gridHeight; y += 1) {
    for (let x = 0; x < store.gridWidth; x += 1) {
      const index = (y * store.gridWidth + x) * 4
      const alpha = imageData.data[index + 3]
      if (alpha < 20) {
        store.paintCell(x, y, null)
        continue
      }

      const hex =
        '#' +
        [imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]]
          .map((channel) => channel.toString(16).padStart(2, '0'))
          .join('')

      const nearest = nearestPaletteColor(hex, store.palette)
      store.paintCell(x, y, nearest.id)
    }
  }
}

function applyPresetSize(width: number, height: number) {
  densityWidth.value = width
  densityHeight.value = height
  store.setDensity(width, height)
  if (uploadedImage.value) {
    void pixelateImageToGrid(uploadedImage.value)
  }
  showCustomSize.value = false
}

function applyDensity() {
  store.setDensity(densityWidth.value, densityHeight.value)
  if (uploadedImage.value) {
    void pixelateImageToGrid(uploadedImage.value)
  }
}

function setLayer(layerId: string) {
  store.activeLayerId = layerId
}

function createExportCanvas() {
  return createExportSheetCanvas({
    gridWidth: store.gridWidth,
    gridHeight: store.gridHeight,
    layers: store.layers,
    palette: store.palette,
    bom: store.bom,
    beadSize: store.beadSize,
    totalBeads: store.totalBeads,
    includeGuides: exportIncludeGuides.value,
    beadShape: store.beadShape,
    labels: {
      title: t('exportSheetTitle'),
      summary: t('exportSheetSummary'),
      preview: t('exportSheetPreview')
    }
  })
}

function exportPng() {
  const canvas = createExportCanvas()
  const link = document.createElement('a')
  link.download = 'beanpixel-sheet.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function importImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const imageUrl = URL.createObjectURL(file)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const instance = new Image()
    instance.onload = () => resolve(instance)
    instance.onerror = reject
    instance.src = imageUrl
  })

  // Store the loaded image for re-pixelation on resolution change
  uploadedImage.value = img
  // Blob URL can be revoked — the img element retains the decoded pixel data
  URL.revokeObjectURL(imageUrl)

  store.saveUndoSnapshot()
  await pixelateImageToGrid(img)
  input.value = ''
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) return false

  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}

function onKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()

  // Ctrl/Cmd+Z = undo (skipped for editable targets to preserve native behavior)
  if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
    if (!isEditableTarget(event.target)) {
      store.undo()
      event.preventDefault()
    }
    return
  }

  const hasUnsupportedModifier = event.ctrlKey || event.metaKey || event.altKey
  if (isEditableTarget(event.target) || hasUnsupportedModifier) return

  if (key === 'b') {
    mode.value = 'paint'
    event.preventDefault()
    return
  }

  if (key === 'i') {
    mode.value = 'pick'
    event.preventDefault()
    return
  }

  if (key === 'r') {
    mode.value = 'erase'
    event.preventDefault()
    return
  }

  if (key === 'g') {
    store.showGrid = !store.showGrid
    event.preventDefault()
    return
  }

  if (event.shiftKey && key === 'l') {
    store.addLayer()
    event.preventDefault()
    return
  }

  if (event.shiftKey && key === 'c') {
    store.clearCanvas()
    event.preventDefault()
    return
  }

  if (key === 'e' && !event.shiftKey) {
    exportPng()
    event.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <main class="h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
    <div class="mx-auto grid h-full max-w-[1400px] gap-4 p-4 lg:grid-cols-[1fr_360px]">
      <!-- Left: workspace, fixed height -->
      <section class="flex min-h-0 flex-col space-y-3 rounded-2xl border border-purple-200 bg-white/80 backdrop-blur-sm p-4 shadow-lg overflow-hidden">
        <header class="shrink-0 space-y-1">
          <h1 class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {{ t('title') }}
          </h1>
          <p class="text-sm text-slate-600">{{ t('subtitle') }}</p>
          <p class="text-xs text-slate-500">
            {{ t('physicalSize') }}: {{ store.physicalSizeCm.width }}cm × {{ store.physicalSizeCm.height }}cm
          </p>
        </header>

        <!-- Workspace toolbar: import image, undo, export -->
        <div class="shrink-0 flex flex-wrap items-center gap-2">
          <label class="cursor-pointer rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:opacity-90 transition-opacity">
            📂 {{ t('importImage') }}
            <input class="hidden" type="file" accept="image/*" @change="importImage" />
          </label>
          <button
            class="rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all"
            :class="store.canUndo
              ? 'bg-purple-50 border border-purple-300 text-purple-700 hover:bg-purple-100'
              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'"
            :disabled="!store.canUndo"
            @click="store.undo()"
          >
            ↩ {{ t('undo') }}
          </button>
          <button class="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:opacity-90 transition-opacity" @click="exportPng">
            ⬇ {{ t('exportPng') }}
          </button>
        </div>

        <TabGroup :selectedIndex="workspaceTab" @change="workspaceTab = $event" class="flex min-h-0 flex-col flex-1">
          <TabList class="shrink-0 flex space-x-1 rounded-xl bg-purple-100 p-1">
            <Tab v-slot="{ selected }" class="w-full focus:outline-none">
              <span
                class="block w-full rounded-lg py-2.5 text-sm font-semibold leading-5 text-center transition-all"
                :class="selected
                  ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-300'
                  : 'text-slate-600 hover:bg-white/70 hover:text-purple-600'"
              >
                {{ t('tabCanvas') }}
              </span>
            </Tab>
            <Tab v-slot="{ selected }" class="w-full focus:outline-none">
              <span
                class="block w-full rounded-lg py-2.5 text-sm font-semibold leading-5 text-center transition-all"
                :class="selected
                  ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-300'
                  : 'text-slate-600 hover:bg-white/70 hover:text-purple-600'"
              >
                {{ t('tab3DPreview') }}
              </span>
            </Tab>
          </TabList>

          <TabPanels class="mt-2 flex-1 min-h-0">
            <TabPanel class="h-full">
              <CanvasBoard :mode="mode" />
            </TabPanel>
            <TabPanel class="h-full">
              <ThreePreview />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </section>

      <!-- Right: sidebar, independent scroll -->
      <aside class="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <!-- Top panel: Controls, Palette, Shortcuts -->
        <section class="rounded-2xl border border-purple-200 bg-white/80 backdrop-blur-sm p-4 shadow-lg shrink-0">
          <TabGroup :selectedIndex="topSidebarTab" @change="topSidebarTab = $event">
            <TabList class="flex space-x-1 rounded-xl bg-purple-100 p-1 mb-3">
              <Tab v-slot="{ selected }" class="flex-1 focus:outline-none">
                <span
                  class="block w-full rounded-lg py-1.5 text-xs font-semibold leading-5 text-center transition-all"
                  :class="selected
                    ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-300'
                    : 'text-slate-600 hover:bg-white/70 hover:text-purple-600'"
                >
                  {{ t('tabControls') }}
                </span>
              </Tab>
              <Tab v-slot="{ selected }" class="flex-1 focus:outline-none">
                <span
                  class="block w-full rounded-lg py-1.5 text-xs font-semibold leading-5 text-center transition-all"
                  :class="selected
                    ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-300'
                    : 'text-slate-600 hover:bg-white/70 hover:text-purple-600'"
                >
                  {{ t('tabPalette') }}
                </span>
              </Tab>
              <Tab v-slot="{ selected }" class="flex-1 focus:outline-none">
                <span
                  class="block w-full rounded-lg py-1.5 text-xs font-semibold leading-5 text-center transition-all"
                  :class="selected
                    ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-300'
                    : 'text-slate-600 hover:bg-white/70 hover:text-purple-600'"
                >
                  {{ t('tabShortcuts') }}
                </span>
              </Tab>
            </TabList>

            <TabPanels>
              <!-- Controls Tab -->
              <TabPanel class="space-y-3 text-sm">
                <label class="block text-slate-700">{{ t('language') }}</label>
                <Listbox v-model="locale">
                  <div class="relative">
                    <ListboxButton class="w-full rounded-lg bg-purple-50 px-3 py-2 text-left border border-purple-200">{{ locale }}</ListboxButton>
                    <ListboxOptions class="absolute z-10 mt-1 w-full rounded-lg bg-white border border-purple-200 p-1 shadow-lg">
                      <ListboxOption
                        v-for="language in languageOptions"
                        :key="language"
                        :value="language"
                        class="cursor-pointer rounded px-2 py-1 ui-active:bg-purple-100"
                      >
                        {{ language }}
                      </ListboxOption>
                    </ListboxOptions>
                  </div>
                </Listbox>

                <label class="block text-slate-700">{{ t('mode') }}</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    class="rounded-lg px-2 py-1"
                    :class="mode === 'paint' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-purple-50 text-slate-600 border border-purple-200'"
                    @click="mode = 'paint'"
                  >
                    {{ t('paint') }}
                  </button>
                  <button
                    class="rounded-lg px-2 py-1"
                    :class="mode === 'pick' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-purple-50 text-slate-600 border border-purple-200'"
                    @click="mode = 'pick'"
                  >
                    {{ t('pick') }}
                  </button>
                  <button
                    class="rounded-lg px-2 py-1"
                    :class="mode === 'erase' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'bg-purple-50 text-slate-600 border border-purple-200'"
                    @click="mode = 'erase'"
                  >
                    {{ t('erase') }}
                  </button>
                </div>

                <label class="flex items-center gap-2 text-slate-700">
                  <input v-model="store.showGrid" type="checkbox" class="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                  {{ t('showGrid') }}
                </label>
                <label class="flex items-center gap-2 text-slate-700">
                  <input v-model="store.showBeadNames" type="checkbox" class="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                  {{ t('showBeadNames') }}
                </label>
                <label class="flex items-center gap-2 text-slate-700">
                  <input v-model="exportIncludeGuides" type="checkbox" class="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                  {{ t('exportIncludeGuides') }}
                </label>

                <label class="block text-slate-700">{{ t('beadSize') }}</label>
                <Listbox v-model="store.beadSize">
                  <div class="relative">
                    <ListboxButton class="w-full rounded-lg bg-purple-50 px-3 py-2 text-left border border-purple-200">{{ store.beadSize }}</ListboxButton>
                    <ListboxOptions class="absolute z-10 mt-1 w-full rounded-lg bg-white border border-purple-200 p-1 shadow-lg">
                      <ListboxOption
                        v-for="option in beadOptions"
                        :key="option"
                        :value="option"
                        class="cursor-pointer rounded px-2 py-1 ui-active:bg-purple-100"
                      >
                        {{ option }}
                      </ListboxOption>
                    </ListboxOptions>
                  </div>
                </Listbox>

                <label class="block text-slate-700">{{ t('beadShape') }}</label>
                <Listbox v-model="store.beadShape">
                  <div class="relative">
                    <ListboxButton class="w-full rounded-lg bg-purple-50 px-3 py-2 text-left border border-purple-200">
                      {{ store.beadShape === 'round' ? t('round') : t('square') }}
                    </ListboxButton>
                    <ListboxOptions class="absolute z-10 mt-1 w-full rounded-lg bg-white border border-purple-200 p-1 shadow-lg">
                      <ListboxOption
                        v-for="option in beadShapeOptions"
                        :key="option"
                        :value="option"
                        class="cursor-pointer rounded px-2 py-1 ui-active:bg-purple-100"
                      >
                        {{ option === 'round' ? t('round') : t('square') }}
                      </ListboxOption>
                    </ListboxOptions>
                  </div>
                </Listbox>

                <label class="block text-slate-700">{{ t('presetSizes') }}</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="preset in presetSizes"
                    :key="`${preset.width}x${preset.height}`"
                    class="rounded-lg bg-purple-50 px-2 py-1 text-xs border border-purple-200 hover:bg-purple-100"
                    @click="applyPresetSize(preset.width, preset.height)"
                  >
                    {{ preset.width }}×{{ preset.height }}
                  </button>
                </div>

                <button
                  class="w-full rounded-lg bg-purple-50 px-2 py-1 text-xs border border-purple-200 hover:bg-purple-100"
                  @click="showCustomSize = !showCustomSize"
                >
                  {{ showCustomSize ? '−' : '+' }} {{ t('customSize') }}
                </button>

                <div v-if="showCustomSize" class="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input v-model.number="densityWidth" type="number" min="8" max="256" class="rounded-lg bg-purple-50 px-2 py-1 text-xs border border-purple-200" />
                  <input v-model.number="densityHeight" type="number" min="8" max="256" class="rounded-lg bg-purple-50 px-2 py-1 text-xs border border-purple-200" />
                  <button class="rounded-lg bg-purple-500 text-white px-2 text-xs shadow-md" @click="applyDensity">OK</button>
                </div>

                <div class="flex gap-2">
                  <button class="flex-1 rounded-lg bg-purple-50 px-2 py-1 text-xs border border-purple-200 hover:bg-purple-100" @click="store.clearCanvas">{{ t('clear') }}</button>
                </div>

                <p v-if="store.isolatedBeads.length > 0" class="mt-3 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-600">
                  {{ t('connectivityWarning') }} ({{ store.isolatedBeads.length }})
                </p>
              </TabPanel>

              <!-- Palette Tab -->
              <TabPanel>
                <div class="space-y-3">
                  <label class="block text-sm text-slate-700">{{ t('paletteGroup') }}</label>
                  <select
                    v-model="store.selectedPaletteGroup"
                    class="w-full rounded-lg bg-purple-50 px-3 py-2 text-sm border border-purple-200"
                  >
                    <option v-for="group in paletteGroups" :key="group.id" :value="group.id">
                      {{ group.displayName }}
                    </option>
                  </select>

                  <div class="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                    <button
                      v-for="color in store.filteredPalette"
                      :key="color.id"
                      :title="`${color.id} ${color.name}`"
                      class="relative flex flex-col items-center gap-0.5"
                      @click="store.selectColor(color.id)"
                    >
                      <!-- Round swatch -->
                      <span
                        class="block h-9 w-9 rounded-full border-2 transition-all"
                        :class="store.selectedColorId === color.id
                          ? 'border-purple-600 ring-2 ring-purple-400 ring-offset-1'
                          : 'border-slate-300 hover:border-purple-400'"
                        :style="{ backgroundColor: color.hex }"
                      />
                      <!-- Color ID label -->
                      <span class="text-[9px] leading-tight text-slate-500 w-full text-center truncate">{{ color.id }}</span>
                    </button>
                  </div>
                  <p class="text-xs text-slate-600">{{ t('selectedColorId') }}: {{ store.selectedColorId }}</p>
                </div>
              </TabPanel>

              <!-- Shortcuts Tab -->
              <TabPanel>
                <ul class="space-y-2 text-sm max-h-96 overflow-y-auto">
                  <li v-for="shortcut in shortcutItems" :key="shortcut.key" class="flex items-center justify-between gap-3 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2">
                    <span class="text-slate-700">{{ shortcut.description }}</span>
                    <kbd class="rounded border border-purple-300 bg-white px-2 py-1 text-xs font-medium text-purple-700">
                      {{ shortcut.key }}
                    </kbd>
                  </li>
                </ul>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </section>

        <!-- Bottom panel: BOM, Layers -->
        <section class="rounded-2xl border border-purple-200 bg-white/80 backdrop-blur-sm p-4 shadow-lg shrink-0">
          <TabGroup :selectedIndex="bottomSidebarTab" @change="bottomSidebarTab = $event">
            <TabList class="flex space-x-1 rounded-xl bg-purple-100 p-1 mb-3">
              <Tab v-slot="{ selected }" class="flex-1 focus:outline-none">
                <span
                  class="block w-full rounded-lg py-1.5 text-xs font-semibold leading-5 text-center transition-all"
                  :class="selected
                    ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-300'
                    : 'text-slate-600 hover:bg-white/70 hover:text-purple-600'"
                >
                  {{ t('tabBOM') }}
                </span>
              </Tab>
              <Tab v-slot="{ selected }" class="flex-1 focus:outline-none">
                <span
                  class="block w-full rounded-lg py-1.5 text-xs font-semibold leading-5 text-center transition-all"
                  :class="selected
                    ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-300'
                    : 'text-slate-600 hover:bg-white/70 hover:text-purple-600'"
                >
                  {{ t('tabLayers') }}
                </span>
              </Tab>
            </TabList>

            <TabPanels>
              <!-- BOM Tab -->
              <TabPanel>
                <ul class="space-y-2 text-sm max-h-64 overflow-y-auto">
                  <li v-for="item in store.bom" :key="item.id" class="flex justify-between rounded-lg bg-purple-50 border border-purple-200 px-2 py-1">
                    <span class="text-slate-700">{{ item.id }} ({{ item.name }})</span>
                    <span class="text-purple-600 font-medium">× {{ item.count }}</span>
                  </li>
                </ul>
                <p class="mt-2 text-xs text-slate-600">{{ t('total') }}: {{ store.totalBeads }}</p>
              </TabPanel>

              <!-- Layers Tab -->
              <TabPanel>
                <div class="space-y-2">
                  <div
                    v-for="layer in store.layers"
                    :key="layer.id"
                    class="flex items-center justify-between rounded-lg border px-2 py-1 cursor-pointer"
                    :class="layer.id === store.activeLayerId ? 'border-purple-400 bg-purple-50' : 'border-purple-200 bg-white hover:bg-purple-50'"
                    @click="setLayer(layer.id)"
                  >
                    <span class="text-sm" :class="{ 'text-purple-700 font-medium': layer.id === store.activeLayerId }">
                      {{ layer.name }}
                    </span>
                    <button
                      class="text-red-500 hover:text-red-700 text-lg"
                      @click.stop="store.removeLayer(layer.id)"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    class="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 text-sm shadow-md"
                    @click="store.addLayer"
                  >
                    {{ t('addLayer') }}
                  </button>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </section>
      </aside>
    </div>
  </main>
</template>
