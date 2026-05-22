/**
 * Keyword-based section retriever for ai-docs.
 * Extracts relevant sections from a document based on search terms.
 */

/**
 * Extract sections from markdown that match any of the given keywords.
 * Returns matching sections (h2/h3 blocks) or the full doc if no sections match.
 */
export function retrieveSections(markdown: string, keywords: string[]): string {
  if (!keywords.length || !markdown) return markdown;

  const lowerKeywords = keywords.map(k => k.toLowerCase());

  // Split by h2/h3 headers
  const sections = markdown.split(/(?=^#{2,3}\s)/m);

  const matching = sections.filter(section => {
    const lower = section.toLowerCase();
    return lowerKeywords.some(kw => lower.includes(kw));
  });

  if (matching.length === 0) return markdown;

  return matching.join('\n\n');
}
