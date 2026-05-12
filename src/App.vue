<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CanvasBoard from './components/CanvasBoard.vue'
import ThreePreview from './components/ThreePreview.vue'
import type { BeadSize } from './types'
import { useEditorStore } from './stores/editor'
import { nearestPaletteColor } from './utils/color'

const store = useEditorStore()
const { t, locale } = useI18n()

const mode = ref<'paint' | 'pick'>('paint')

const densityWidth = ref(store.gridWidth)
const densityHeight = ref(store.gridHeight)

const beadOptions: BeadSize[] = ['5mm', '2.6mm']
const languageOptions = ['zh', 'en'] as const

const colorMap = computed(() => {
  const map = new Map(store.palette.map((item) => [item.id, item]))
  return map
})

function applyDensity() {
  store.setDensity(densityWidth.value, densityHeight.value)
}

function setLayer(layerId: string) {
  store.activeLayerId = layerId
}

function exportPng() {
  const canvas = document.createElement('canvas')
  const size = 24
  canvas.width = store.gridWidth * size
  canvas.height = store.gridHeight * size

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (const layer of store.layers) {
    for (let y = 0; y < store.gridHeight; y += 1) {
      for (let x = 0; x < store.gridWidth; x += 1) {
        const colorId = layer.grid[y]?.[x]
        if (!colorId) continue

        const color = colorMap.value.get(colorId)
        if (!color) continue

        ctx.fillStyle = color.hex
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2)
      }
    }
  }

  const link = document.createElement('a')
  link.download = 'beanpixel-export.png'
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

  const canvas = document.createElement('canvas')
  canvas.width = store.gridWidth
  canvas.height = store.gridHeight

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  ctx.drawImage(img, 0, 0, store.gridWidth, store.gridHeight)
  const imageData = ctx.getImageData(0, 0, store.gridWidth, store.gridHeight)

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

  URL.revokeObjectURL(imageUrl)
  input.value = ''
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[1fr_360px]">
      <section class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold">{{ t('title') }}</h1>
          <p class="text-sm text-slate-300">{{ t('subtitle') }}</p>
          <p class="text-xs text-slate-400">
            {{ t('physicalSize') }}: {{ store.physicalSizeCm.width }}cm × {{ store.physicalSizeCm.height }}cm
          </p>
        </header>

        <CanvasBoard :mode="mode" />
      </section>

      <aside class="space-y-4">
        <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 class="mb-3 text-lg font-semibold">{{ t('controls') }}</h2>

          <div class="space-y-3 text-sm">
            <label class="block">{{ t('language') }}</label>
            <Listbox v-model="locale">
              <div class="relative">
                <ListboxButton class="w-full rounded bg-slate-800 px-3 py-2 text-left">{{ locale }}</ListboxButton>
                <ListboxOptions class="absolute z-10 mt-1 w-full rounded bg-slate-800 p-1 shadow-lg">
                  <ListboxOption
                    v-for="language in languageOptions"
                    :key="language"
                    :value="language"
                    class="cursor-pointer rounded px-2 py-1 ui-active:bg-slate-700"
                  >
                    {{ language }}
                  </ListboxOption>
                </ListboxOptions>
              </div>
            </Listbox>

            <label class="block">{{ t('mode') }}</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                class="rounded px-2 py-1"
                :class="mode === 'paint' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800'"
                @click="mode = 'paint'"
              >
                {{ t('paint') }}
              </button>
              <button
                class="rounded px-2 py-1"
                :class="mode === 'pick' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800'"
                @click="mode = 'pick'"
              >
                {{ t('pick') }}
              </button>
            </div>

            <label class="flex items-center gap-2">
              <input v-model="store.showGrid" type="checkbox" /> {{ t('showGrid') }}
            </label>

            <label class="block">{{ t('beadSize') }}</label>
            <Listbox v-model="store.beadSize">
              <div class="relative">
                <ListboxButton class="w-full rounded bg-slate-800 px-3 py-2 text-left">{{ store.beadSize }}</ListboxButton>
                <ListboxOptions class="absolute z-10 mt-1 w-full rounded bg-slate-800 p-1 shadow-lg">
                  <ListboxOption
                    v-for="option in beadOptions"
                    :key="option"
                    :value="option"
                    class="cursor-pointer rounded px-2 py-1 ui-active:bg-slate-700"
                  >
                    {{ option }}
                  </ListboxOption>
                </ListboxOptions>
              </div>
            </Listbox>

            <label class="block">{{ t('density') }}</label>
            <div class="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input v-model.number="densityWidth" type="number" min="8" max="256" class="rounded bg-slate-800 px-2 py-1" />
              <input v-model.number="densityHeight" type="number" min="8" max="256" class="rounded bg-slate-800 px-2 py-1" />
              <button class="rounded bg-slate-700 px-2" @click="applyDensity">OK</button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <label class="cursor-pointer rounded bg-slate-800 px-2 py-1 text-center">
                {{ t('importImage') }}
                <input class="hidden" type="file" accept="image/*" @change="importImage" />
              </label>
              <button class="rounded bg-slate-800 px-2 py-1" @click="store.clearCanvas">{{ t('clear') }}</button>
              <button class="col-span-2 rounded bg-emerald-500 px-2 py-1 font-medium text-slate-950" @click="exportPng">
                {{ t('exportPng') }}
              </button>
            </div>
          </div>

          <div class="mt-4">
            <h3 class="mb-2 font-medium">Layers</h3>
            <div class="space-y-2">
              <div
                v-for="layer in store.layers"
                :key="layer.id"
                class="flex items-center justify-between rounded border border-slate-700 px-2 py-1"
              >
                <button class="text-left" :class="{ 'text-sky-300': layer.id === store.activeLayerId }" @click="setLayer(layer.id)">
                  {{ layer.name }}
                </button>
                <button class="text-red-300" @click="store.removeLayer(layer.id)">×</button>
              </div>
              <button class="w-full rounded bg-slate-700 px-2 py-1" @click="store.addLayer">{{ t('addLayer') }}</button>
            </div>
          </div>

          <div class="mt-4">
            <h3 class="mb-2 font-medium">Palette</h3>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="color in store.palette"
                :key="color.id"
                :title="`${color.id} ${color.name}`"
                class="h-8 rounded border"
                :class="store.selectedColorId === color.id ? 'border-white ring-1 ring-white' : 'border-slate-700'"
                :style="{ backgroundColor: color.hex }"
                @click="store.selectColor(color.id)"
              />
            </div>
            <p class="mt-2 text-xs">Selected: {{ store.selectedColorId }}</p>
          </div>

          <p v-if="store.isolatedBeads.length > 0" class="mt-3 rounded bg-red-500/20 p-2 text-xs text-red-200">
            {{ t('connectivityWarning') }} ({{ store.isolatedBeads.length }})
          </p>
        </section>

        <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 class="mb-3 text-lg font-semibold">3D</h2>
          <ThreePreview />
        </section>

        <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 class="mb-3 text-lg font-semibold">{{ t('bom') }}</h2>
          <ul class="space-y-2 text-sm">
            <li v-for="item in store.bom" :key="item.id" class="flex justify-between rounded bg-slate-800 px-2 py-1">
              <span>{{ item.id }} ({{ item.name }})</span>
              <span>x {{ item.count }}</span>
            </li>
          </ul>
          <p class="mt-2 text-xs text-slate-300">{{ t('total') }}: {{ store.totalBeads }}</p>
        </section>
      </aside>
    </div>
  </main>
</template>
