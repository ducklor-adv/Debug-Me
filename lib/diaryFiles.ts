import { marked } from 'marked';

export interface ParsedMarkdown {
  /** raw frontmatter key/value pairs (simple YAML, no nesting) */
  frontmatter: Record<string, string>;
  /** raw markdown body (frontmatter stripped) */
  body: string;
  /** title from frontmatter, first H1, or null */
  title: string | null;
  /** date from frontmatter, or null */
  date: string | null;
}

const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/;

/** Parse YAML-like frontmatter (simple key: value, no nesting) */
function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { fm: {}, body: raw };
  const fm: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) fm[key] = value;
  }
  return { fm, body: raw.slice(match[0].length) };
}

/** Extract first H1 (# Title) from markdown body */
function extractFirstHeading(body: string): string | null {
  const m = body.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

marked.setOptions({ gfm: true, breaks: false });

/** Parse a raw .md string into structured fields */
export function parseMarkdown(raw: string): ParsedMarkdown {
  const { fm, body } = parseFrontmatter(raw);
  return {
    frontmatter: fm,
    body,
    title: fm.title || extractFirstHeading(body),
    date: fm.date || null,
  };
}

/** Render a markdown body (without frontmatter) to HTML */
export function renderMarkdownToHtml(body: string): string {
  return marked.parse(body, { async: false }) as string;
}

/** Extract YYYY-MM-DD from filename like "2026-04-27.md" or "2026-04-27-handoff.md" */
export function extractDateFromFilename(fileName: string): string | null {
  const slug = fileName.replace(/\.md$/i, '');
  const m = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
