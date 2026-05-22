import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Page-aware document loader for AI context.
 * Loads relevant ai-docs based on the current ERP page.
 */

const PAGE_DOC_MAP: Record<string, string[]> = {
  '/bookings':      ['booking-guide.md', 'erp-reference.md'],
  '/workers':       ['worker-guide.md', 'erp-reference.md'],
  '/clients':       ['client-guide.md', 'erp-reference.md'],
  '/availability':  ['worker-guide.md', 'booking-guide.md'],
  '/finances':      ['finance-guide.md'],
  '/settings':      ['settings-guide.md'],
  '/notifications': ['erp-reference.md'],
  'default':        ['erp-reference.md', 'tools-reference.md'],
};

const AI_DOCS_DIR = join(process.cwd(), 'ai-docs');

function readDoc(filename: string): string {
  const path = join(AI_DOCS_DIR, filename);
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  return '';
}

/**
 * Load and concatenate relevant docs for the given page path.
 */
export function loadDocsForPage(currentPath: string): string {
  // Match against known pages
  const matchedKey = Object.keys(PAGE_DOC_MAP).find(
    key => key !== 'default' && currentPath.includes(key)
  );

  const docFiles = PAGE_DOC_MAP[matchedKey || 'default'];
  const docs = docFiles
    .map(f => readDoc(f))
    .filter(Boolean);

  if (docs.length === 0) {
    return 'No specific documentation available for this page.';
  }

  return docs.join('\n\n---\n\n');
}
