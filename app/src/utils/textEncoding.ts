/**
 * Fix text that was incorrectly decoded as Windows-1252 instead of UTF-8.
 * This commonly happens with PDF text layers where smart quotes, em dashes,
 * and other Unicode characters appear as mojibake (e.g. â€™ instead of ').
 */

// Map Windows-1252 characters (0x80-0x9F range) back to their byte values.
// These code points differ between Windows-1252 and Unicode/Latin-1.
const win1252ToByte: Record<number, number> = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201C: 0x93, // "
  0x201D: 0x94, // "
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
}

export function fixMojibake(text: string): string {
  // Quick check: look for â followed by either € (Windows-1252) or \x80 (Latin-1)
  // These are the telltale first two bytes of a UTF-8 multi-byte sequence misinterpreted
  if (!text.includes('\u00E2\u20AC') && !text.includes('\u00E2\u0080')) return text

  try {
    const bytes: number[] = []
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      if (code < 0x80) {
        bytes.push(code)
      } else if (code <= 0xFF) {
        bytes.push(code)
      } else if (win1252ToByte[code] !== undefined) {
        bytes.push(win1252ToByte[code])
      } else {
        // Character not representable in Windows-1252 — not mojibake, return as-is
        return text
      }
    }
    const decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes))
    // Only use fixed version if no replacement characters appeared
    if (!decoded.includes('\uFFFD')) {
      return decoded
    }
  } catch {
    // Decoding failed, return original
  }
  return text
}
