/**
 * Safely normalizes Arabic text by:
 * 1. Removing Arabic diacritics (Tashkeel)
 * 2. Normalizing Alef variants (أ, إ, آ, ٱ -> ا)
 * 3. Normalizing Ta Marbuta (ة -> ه)
 * 4. Normalizing Alef Maqsoora / Yaa (ى -> ي)
 * 5. Stripping punctuation
 * 6. Collapsing whitespace and trimming
 */
export function normalizeArabic(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove Arabic diacritics (tashkeel)
    .replace(/[\u064B-\u0652]/g, '')
    // Normalize Alef variants
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Ta Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Alef Maqsoora
    .replace(/ى/g, 'ي')
    // Strip punctuation marks
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?،"'«»]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}
