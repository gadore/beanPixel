/**
 * Calculate the relative luminance of a color
 * Uses the formula: 0.2126*R + 0.7152*G + 0.0722*B
 * Returns a value between 0 (darkest) and 255 (lightest)
 */
export function getColorLuminance(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace('#', '')
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  
  // Calculate relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Determine if a color is light (luminance > 128)
 */
export function isLightColor(hex: string): boolean {
  return getColorLuminance(hex) > 128
}

/**
 * Get the appropriate text color (black or white) for a background color
 */
export function getTextColorForBackground(hex: string): string {
  return isLightColor(hex) ? '#000000' : '#ffffff'
}
