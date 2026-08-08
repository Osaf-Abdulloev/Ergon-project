/**
 * Utility to strip PDF stream artifacts, binary garbage markers,
 * and unprintable characters from text.
 */
export const cleanText = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // Strip PDF binary markers
  let cleaned = text
    .replace(/<<.*?>>/gs, '')
    .replace(/\/Filter\s*\/FlateDecode/gi, '')
    .replace(/FlateDecode/gi, '')
    .replace(/\/Length\s+\d+/gi, '')
    .replace(/%PDF-\d\.\d/gi, '')
    .replace(/endobj|endstream|stream/gi, '');

  // Filter lines containing PDF markers or binary noise
  const lines = cleaned.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.includes('<</Length') || trimmed.includes('/FlateDecode') || trimmed.includes('Filter/FlateDecode')) {
      return false;
    }
    // Filter lines where readable characters account for less than 40%
    const readableChars = (trimmed.match(/[a-zA-Z0-9а-яА-ЯёЁ \.,\-\(\):@\+\/]/g) || []).length;
    if (trimmed.length > 8 && readableChars / trimmed.length < 0.4) {
      return false;
    }
    return true;
  });

  return lines.join('\n').trim();
};
