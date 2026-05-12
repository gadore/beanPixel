<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { useEditorStore } from '../stores/editor'

const containerRef = ref<HTMLDivElement | null>(null)
const store = useEditorStore()

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let frameId = 0

function buildScene() {
  const container = containerRef.value
  if (!container || !scene) return

  scene.children = scene.children.filter((child: THREE.Object3D) => child.userData.keep)

  const beadRadius = 0.18

  for (let layerIndex = 0; layerIndex < store.layers.length; layerIndex += 1) {
    const layer = store.layers[layerIndex]

    for (let y = 0; y < store.gridHeight; y += 1) {
      for (let x = 0; x < store.gridWidth; x += 1) {
        const colorId = layer.grid[y]?.[x]
        if (!colorId) continue

        const color = store.palette.find((item) => item.id === colorId)
        if (!color) continue

        const geometry = new THREE.CylinderGeometry(beadRadius, beadRadius, 0.2, 16)
        const material = new THREE.MeshStandardMaterial({ color: color.hex, roughness: 0.6 })
        const bead = new THREE.Mesh(geometry, material)

        bead.position.set(
          x * 0.44 - (store.gridWidth * 0.44) / 2,
          layerIndex * 0.25,
          y * 0.44 - (store.gridHeight * 0.44) / 2
        )

        scene.add(bead)
      }
    }
  }
}

function render() {
  if (!renderer || !scene || !camera) return
  renderer.render(scene, camera)
  frameId = requestAnimationFrame(render)
}

function onResize() {
  if (!renderer || !camera || !containerRef.value) return
  const { clientWidth, clientHeight } = containerRef.value
  renderer.setSize(clientWidth, clientHeight)
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
}

onMounted(() => {
  const container = containerRef.value
  if (!container) return

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#020617')

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
  camera.position.set(8, 8, 10)
  camera.lookAt(0, 0, 0)

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  ambient.userData.keep = true
  scene.add(ambient)

  const directional = new THREE.DirectionalLight(0xffffff, 0.8)
  directional.position.set(8, 12, 6)
  directional.userData.keep = true
  scene.add(directional)

  buildScene()
  render()

  window.addEventListener('resize', onResize)
})

watch(
  () => [store.layers, store.gridWidth, store.gridHeight],
  () => {
    buildScene()
  },
  { deep: true }
)

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (frameId) cancelAnimationFrame(frameId)
  renderer?.dispose()
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div ref="containerRef" class="h-72 w-full overflow-hidden rounded-xl border border-slate-700"></div>
</template>
