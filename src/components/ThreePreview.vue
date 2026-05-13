<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useEditorStore } from '../stores/editor'

const containerRef = ref<HTMLDivElement | null>(null)
const store = useEditorStore()

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let frameId = 0

// Cache one SpriteMaterial per unique color ID to avoid re-creating textures
const labelMaterialCache = new Map<string, THREE.SpriteMaterial>()

function getLabelMaterial(id: string): THREE.SpriteMaterial {
  const cached = labelMaterialCache.get(id)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    const fallback = new THREE.SpriteMaterial({ depthTest: false })
    labelMaterialCache.set(id, fallback)
    return fallback
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  ctx.roundRect(2, 2, 124, 60, 8)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.font = 'bold 34px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(id, 64, 32)

  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    depthTest: false
  })
  labelMaterialCache.set(id, material)
  return material
}

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

        const posX = x * 0.44 - (store.gridWidth * 0.44) / 2
        const posY = layerIndex * 0.25
        const posZ = y * 0.44 - (store.gridHeight * 0.44) / 2

        bead.position.set(posX, posY, posZ)
        scene.add(bead)

        if (store.showBeadNames) {
          const sprite = new THREE.Sprite(getLabelMaterial(color.id))
          sprite.scale.set(0.32, 0.16, 1)
          sprite.position.set(posX, posY + 0.28, posZ)
          scene.add(sprite)
        }
      }
    }
  }
}

function render() {
  if (!renderer || !scene || !camera || !controls) return
  controls.update()
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
  scene.background = new THREE.Color('#f8fafc')

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
  camera.position.set(8, 8, 10)
  camera.lookAt(0, 0, 0)
  
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.screenSpacePanning = false
  controls.minDistance = 3
  controls.maxDistance = 50
  controls.maxPolarAngle = Math.PI / 2

  const ambient = new THREE.AmbientLight(0xffffff, 1.2)
  ambient.userData.keep = true
  scene.add(ambient)

  const directional = new THREE.DirectionalLight(0xffffff, 1.8)
  directional.position.set(8, 12, 6)
  directional.userData.keep = true
  scene.add(directional)

  const fill = new THREE.DirectionalLight(0xffffff, 0.6)
  fill.position.set(-6, 4, -8)
  fill.userData.keep = true
  scene.add(fill)

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

watch(() => store.showBeadNames, () => {
  buildScene()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (frameId) cancelAnimationFrame(frameId)
  controls?.dispose()
  renderer?.dispose()
  for (const mat of labelMaterialCache.values()) {
    mat.map?.dispose()
    mat.dispose()
  }
  labelMaterialCache.clear()
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div ref="containerRef" class="h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-300"></div>
</template>
