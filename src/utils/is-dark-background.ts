/**
 * Returns true if the hex color is dark (needs light text for contrast).
 * Uses relative luminance; threshold 0.5 (normalized) ≈ mid-gray.
 */
export function isDarkBackground(hex: string): boolean {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length !== 6 && cleaned.length !== 3) return true; // default: dark
  let r: number, g: number, b: number;
  if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16) / 255;
    g = parseInt(cleaned.slice(2, 4), 16) / 255;
    b = parseInt(cleaned.slice(4, 6), 16) / 255;
  } else {
    r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
  }
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.5;
}
