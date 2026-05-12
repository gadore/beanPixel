# BeanPixel · Perler Bead Digital Platform

Vue 3 + Vite based perler bead editor with pixel canvas, color mapping, connectivity safety checks, multi-layer management, and Three.js 3D preview.

## Stage 1 · Blueprint

### Core Data Structure (Grid Map)

```ts
interface Layer {
  id: string
  name: string
  grid: (string | null)[][] // color id in each pixel
}

interface EditorState {
  gridWidth: number
  gridHeight: number
  beadSize: '5mm' | '2.6mm'
  showGrid: boolean
  selectedColorId: string
  layers: Layer[]
  activeLayerId: string
}
```

### Color Library JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PerlerPalette",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "name", "hex"],
    "properties": {
      "id": { "type": "string", "pattern": "^[A-Z][0-9]{2}$" },
      "name": { "type": "string", "minLength": 1 },
      "hex": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }
    },
    "additionalProperties": false
  }
}
```

### Project Architecture

- `src/stores/editor.ts`: Pinia state for layers, grid density, bead size, BOM, selection.
- `src/components/CanvasBoard.vue`: 2D canvas editor (zoom/pan/grid/pick/paint/isolated warning overlay).
- `src/components/ThreePreview.vue`: Three.js 3D stacked layer renderer.
- `src/utils/color.ts`: RGB/Lab + CIEDE2000 nearest-color mapping.
- `src/utils/connectivity.ts`: BFS connectivity check for disconnected beads.
- `src/i18n/index.ts`: Chinese/English translation resources.

## Stage 2 · Roadmap (priority)

- [x] 基础画布 (Canvas, zoom/pan, grid toggle, draw/pick)
- [x] 色号系统 (palette, selected color sync, BOM)
- [x] 图像转换 (image upload + CIEDE2000 palette quantization)
- [x] 连通性算法 (BFS disconnected bead warning)
- [x] 3D 预览 (Three.js layered stacked preview)
- [x] PDF 图纸导出
- [ ] Mobile gestures (two-finger zoom, long-press pick)
- [ ] Keyboard shortcut map

## Stage 3 · Implementation Notes

Implemented in this repository:

1. Responsive Vue 3 editor with Pinia-managed canvas state.
2. Physical size estimation (cm) for 5mm/2.6mm beads.
3. Bidirectional color interaction:
   - Pick mode: click canvas bead to sync selected palette color.
   - Paint mode: click/drag to overwrite beads.
4. Connectivity safety: disconnected components are highlighted red and counted.
5. Multi-layer model with add/remove/switch and live 3D stacked rendering.
6. Real-time BOM statistics across all layers.
7. Export: high-resolution PNG.
8. i18n: Chinese/English language switching.

## Development

```bash
npm install
npm run dev
npm run test
npm run build
```
