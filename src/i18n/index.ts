import { createI18n } from 'vue-i18n'

export const messages = {
  en: {
    title: 'BeanPixel · Perler Bead Studio',
    subtitle: 'Canvas + palette + connectivity + layered 3D preview',
    controls: 'Controls',
    mode: 'Tool',
    paint: 'Paint',
    pick: 'Pick',
    showGrid: 'Show grid',
    beadSize: 'Bead size',
    density: 'Density',
    importImage: 'Import image',
    clear: 'Clear',
    exportPng: 'Export PNG',
    exportPdf: 'Export PDF',
    exportIncludeGuides: 'Include guide lines in exports',
    addLayer: 'Add layer',
    connectivityWarning: 'Disconnected beads detected',
    bom: 'BOM',
    total: 'Total',
    language: 'Language',
    physicalSize: 'Physical size',
    pdfPreparing: 'Preparing PDF...',
    exportSheetTitle: 'BeanPixel Export Sheet',
    exportSheetSummary: 'Canvas',
    exportSheetPreview: 'Pattern Preview',
    exportSheetLayout: 'Layout Chart',
    exportSheetEmptyBom: 'No beads placed yet',
    canvasHint: 'Zoom {zoom}% · Shift+drag to pan · Pinch to zoom · Long press to pick'
  },
  zh: {
    title: 'BeanPixel · 拼豆数字创作平台',
    subtitle: '画布 + 色板 + 连通性检测 + 多图层 3D 预览',
    controls: '控制面板',
    mode: '工具',
    paint: '绘制',
    pick: '取色',
    showGrid: '显示网格',
    beadSize: '豆子规格',
    density: '像素密度',
    importImage: '导入图片',
    clear: '清空',
    exportPng: '导出 PNG',
    exportPdf: '导出 PDF',
    exportIncludeGuides: '导出时包含辅助线',
    addLayer: '新增图层',
    connectivityWarning: '检测到孤立像素，请检查结构强度',
    bom: '物料清单',
    total: '总数',
    language: '语言',
    physicalSize: '物理尺寸',
    pdfPreparing: '正在生成 PDF...',
    exportSheetTitle: 'BeanPixel 导出总览图',
    exportSheetSummary: '画布',
    exportSheetPreview: '图案预览',
    exportSheetLayout: '布局图',
    exportSheetEmptyBom: '当前还没有豆子',
    canvasHint: '缩放 {zoom}% · Shift+拖动平移 · 双指缩放 · 长按取色'
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages
})
