/**
 * WCAG contrast safety utilities.
 * Used by the branding step in the onboarding wizard.
 */

/** Parse hex color to RGB */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/** Compute relative luminance per WCAG 2.0 formula */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Compute contrast ratio between two colors (WCAG 2.0) */
export function contrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 0;

  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Check if contrast meets WCAG AA (4.5:1 for normal text) */
export function meetsWcagAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 4.5;
}

/** Check if contrast meets WCAG AA for large text (3:1) */
export function meetsWcagAALarge(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 3;
}

/** Auto-select white or dark text on a given background */
export function autoTextColor(background: string): string {
  const rgb = hexToRgb(background);
  if (!rgb) return '#111827'; // fallback to dark

  const luminance = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.179 ? '#111827' : '#FFFFFF';
}

/**
 * Suggest an adjusted color that passes WCAG AA against a surface.
 * Lightens or darkens the color until contrast >= 4.5:1.
 */
export function suggestAccessibleColor(color: string, surface: string): string {
  const colorRgb = hexToRgb(color);
  const surfaceRgb = hexToRgb(surface);
  if (!colorRgb || !surfaceRgb) return color;

  const surfaceLum = relativeLuminance(surfaceRgb.r, surfaceRgb.g, surfaceRgb.b);

  // Determine direction: darken if surface is light, lighten if dark
  const shouldDarken = surfaceLum > 0.5;

  let r = colorRgb.r;
  let g = colorRgb.g;
  let b = colorRgb.b;

  for (let i = 0; i < 50; i++) {
    const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    if (contrastRatio(hex, surface) >= 4.5) return hex;

    if (shouldDarken) {
      r = Math.max(0, r - 5);
      g = Math.max(0, g - 5);
      b = Math.max(0, b - 5);
    } else {
      r = Math.min(255, r + 5);
      g = Math.min(255, g + 5);
      b = Math.min(255, b + 5);
    }
  }

  return color; // fallback
}

/** Map widget_bg option to hex value */
export function widgetBgToHex(bg: string): string {
  switch (bg) {
    case 'white': return '#FFFFFF';
    case 'off-white': return '#F9FAFB';
    case 'light-gray': return '#F3F4F6';
    case 'dark': return '#1F2937';
    default: return '#FFFFFF';
  }
}
