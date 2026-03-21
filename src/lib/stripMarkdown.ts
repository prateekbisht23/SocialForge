export function stripMarkdown(text: string): string {
  return text
    // Remove **bold** and __bold__
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove *italic* and _italic_
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove # headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove [placeholder] style template text
    .replace(/\[([^\]]+)\]/g, (match, inner) => {
      // Keep if it looks like actual content (short, no spaces describing format)
      const isPlaceholder = /^(Common assumption|Reframe|Your |Insert |Add |CTA|Hook|Opening)/i.test(inner)
      return isPlaceholder ? '' : inner
    })
    // Remove markdown links [text](url) — keep just the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Clean up multiple consecutive blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Clean up leading/trailing whitespace
    .trim()
}
