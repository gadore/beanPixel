import type { PaletteColor } from '../types'

interface LabColor {
  l: number
  a: number
  b: number
}

export type RgbColor = [number, number, number]

const MIN_ALPHA_THRESHOLD = 20
const MAX_COLOR_SAMPLES = 4096

function getLabChroma(color: LabColor) {
  return Math.hypot(color.a, color.b)
}

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.split('').map((ch) => `${ch}${ch}`).join('') : clean
  const int = Number.parseInt(normalized, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

export function rgbToHex([r, g, b]: RgbColor): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

function rgbToXyz(r: number, g: number, b: number): RgbColor {
  const pivot = (value: number) => {
    const v = value / 255
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92
  }

  const rl = pivot(r)
  const gl = pivot(g)
  const bl = pivot(b)

  return [
    rl * 0.4124 + gl * 0.3576 + bl * 0.1805,
    rl * 0.2126 + gl * 0.7152 + bl * 0.0722,
    rl * 0.0193 + gl * 0.1192 + bl * 0.9505
  ]
}

function xyzToLab(x: number, y: number, z: number): LabColor {
  const refX = 0.95047
  const refY = 1.0
  const refZ = 1.08883

  const pivot = (value: number) => (value > 0.008856 ? value ** (1 / 3) : 7.787 * value + 16 / 116)

  const fx = pivot(x / refX)
  const fy = pivot(y / refY)
  const fz = pivot(z / refZ)

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  }
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  const [x, y, z] = rgbToXyz(r, g, b)
  return xyzToLab(x, y, z)
}

export function deltaE2000(lab1: LabColor, lab2: LabColor): number {
  const c1 = Math.sqrt(lab1.a ** 2 + lab1.b ** 2)
  const c2 = Math.sqrt(lab2.a ** 2 + lab2.b ** 2)
  const avgC = (c1 + c2) / 2

  const g = 0.5 * (1 - Math.sqrt((avgC ** 7) / (avgC ** 7 + 25 ** 7)))
  const a1p = (1 + g) * lab1.a
  const a2p = (1 + g) * lab2.a
  const c1p = Math.sqrt(a1p ** 2 + lab1.b ** 2)
  const c2p = Math.sqrt(a2p ** 2 + lab2.b ** 2)

  const h1p = Math.atan2(lab1.b, a1p)
  const h2p = Math.atan2(lab2.b, a2p)

  const toDegrees = (radians: number) => (radians * 180) / Math.PI
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const h1pd = (toDegrees(h1p) + 360) % 360
  const h2pd = (toDegrees(h2p) + 360) % 360

  const dLp = lab2.l - lab1.l
  const dCp = c2p - c1p

  let dhp = 0
  if (c1p * c2p !== 0) {
    if (Math.abs(h2pd - h1pd) <= 180) dhp = h2pd - h1pd
    else dhp = h2pd <= h1pd ? h2pd - h1pd + 360 : h2pd - h1pd - 360
  }

  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(toRadians(dhp / 2))
  const avgLpp = (lab1.l + lab2.l) / 2
  const avgCpp = (c1p + c2p) / 2

  let avgHpp = h1pd + h2pd
  if (c1p * c2p === 0) avgHpp = h1pd + h2pd
  else if (Math.abs(h1pd - h2pd) <= 180) avgHpp = (h1pd + h2pd) / 2
  // Hue is circular: hues around 0°/360° must wrap forward when their sum is below 360°.
  else if (h1pd + h2pd < 360) avgHpp = (h1pd + h2pd + 360) / 2
  // Otherwise wrap backward so the average stays on the shortest arc between hues.
  else avgHpp = (h1pd + h2pd - 360) / 2

  const t =
    1 -
    0.17 * Math.cos(toRadians(avgHpp - 30)) +
    0.24 * Math.cos(toRadians(2 * avgHpp)) +
    0.32 * Math.cos(toRadians(3 * avgHpp + 6)) -
    0.2 * Math.cos(toRadians(4 * avgHpp - 63))

  const deltaTheta = 30 * Math.exp(-(((avgHpp - 275) / 25) ** 2))
  const rc = 2 * Math.sqrt((avgCpp ** 7) / (avgCpp ** 7 + 25 ** 7))
  const sl = 1 + (0.015 * (avgLpp - 50) ** 2) / Math.sqrt(20 + (avgLpp - 50) ** 2)
  const sc = 1 + 0.045 * avgCpp
  const sh = 1 + 0.015 * avgCpp * t
  const rt = -Math.sin(toRadians(2 * deltaTheta)) * rc

  return Math.sqrt(
    (dLp / sl) ** 2 +
      (dCp / sc) ** 2 +
      (dHp / sh) ** 2 +
      rt * (dCp / sc) * (dHp / sh)
  )
}

export function nearestPaletteColorFromRgb([r, g, b]: RgbColor, palette: PaletteColor[]): PaletteColor {
  const sourceLab = rgbToLab(r, g, b)
  const sourceChroma = getLabChroma(sourceLab)

  return palette.reduce(
    (best, color) => {
      const [pr, pg, pb] = hexToRgb(color.hex)
      const candidateLab = rgbToLab(pr, pg, pb)
      const candidateChroma = getLabChroma(candidateLab)

      let distance = deltaE2000(sourceLab, candidateLab)

      if (sourceChroma > 6 && candidateChroma < 6) {
        distance += (sourceChroma - candidateChroma) * 0.7
      }

      return distance < best.distance ? { color, distance } : best
    },
    { color: palette[0], distance: Number.POSITIVE_INFINITY }
  ).color
}

export function nearestPaletteColor(hex: string, palette: PaletteColor[]): PaletteColor {
  return nearestPaletteColorFromRgb(hexToRgb(hex), palette)
}

export function dominantRgbFromImageData(
  imageData: ImageData,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): RgbColor | null {
  const x0 = Math.max(0, Math.floor(startX))
  const y0 = Math.max(0, Math.floor(startY))
  const x1 = Math.min(imageData.width, Math.ceil(endX))
  const y1 = Math.min(imageData.height, Math.ceil(endY))

  if (x0 >= x1 || y0 >= y1) return null

  const area = (x1 - x0) * (y1 - y0)
  // Increase stride by the square root of area so the sampled pixel count stays bounded.
  const step = Math.max(1, Math.ceil(Math.sqrt(area / MAX_COLOR_SAMPLES)))
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const index = (y * imageData.width + x) * 4
      const alpha = imageData.data[index + 3]
      if (alpha < MIN_ALPHA_THRESHOLD) continue

      const r = imageData.data[index]
      const g = imageData.data[index + 1]
      const b = imageData.data[index + 2]
      // Reduce each 8-bit channel to 4 bits, creating a 12-bit bucket key.
      const bucket = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const current = buckets.get(bucket) ?? { count: 0, r: 0, g: 0, b: 0 }

      current.count += 1
      current.r += r
      current.g += g
      current.b += b
      buckets.set(bucket, current)
    }
  }

  let best: { count: number; r: number; g: number; b: number } | null = null
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) {
      best = bucket
    }
  }

  return best ? [best.r / best.count, best.g / best.count, best.b / best.count] : null
}
