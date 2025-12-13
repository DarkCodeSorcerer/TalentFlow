import type { Buffer } from 'node:buffer';

export function isPDF(buffer: Buffer): boolean {
  return buffer.slice(0, 4).toString() === "%PDF";
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const parsed = await pdfParse(buffer);
  const text = parsed.text || '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
