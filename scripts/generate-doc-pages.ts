/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Markdown -> HTML documentation page generator for the docs portal.
 *
 * WHAT: Renders the long-form architecture Markdown references in `docs/` (Frontend, Backend,
 * DevOps, Communication ADR, Entity/ERD spec, Ontology spec, Speaker cue cards) into standalone,
 * styled HTML pages that match the look of the hand-authored pages already in the portal.
 *
 * WHY: `docs/index.html` linked these documents as raw `.md` with a `download` attribute, so every
 * browser saved them to disk instead of displaying them — the Frontend/Backend/DevOps cards simply
 * downloaded a file while neighbouring cards opened a readable page. Serving a rendered HTML
 * sibling makes them open in-browser like the rest of the portal, while the original Markdown stays
 * downloadable for offline/diff use.
 *
 * Pages that already have a curated, hand-written HTML counterpart (Learning Topics, CS PhD essay,
 * RAG comparison, Wizard-of-Oz explainer, Speaker Notes, Technical Requirements) are deliberately
 * NOT generated here so their bespoke layouts are never overwritten.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');

interface DocPage {
  /** Source Markdown file name inside `docs/`. */
  source: string;
  /** Generated HTML file name inside `docs/`. */
  output: string;
  /** Small eyebrow label shown above the title in the hero band. */
  eyebrow: string;
}

/**
 * Markdown references that are rendered into portal pages.
 *
 * WHY: An explicit list (rather than a glob over `docs/*.md`) keeps generation deterministic and
 * guarantees the curated hand-written pages are never clobbered by a generated one.
 */
const PAGES: DocPage[] = [
  { source: 'FRONTEND_ARCHITECTURE.md', output: 'frontend-architecture.html', eyebrow: 'Architecture Reference' },
  { source: 'BACKEND_ARCHITECTURE.md', output: 'backend-architecture.html', eyebrow: 'Architecture Reference' },
  { source: 'DEVOPS_GUIDE.md', output: 'devops-guide.html', eyebrow: 'Operations Reference' },
  { source: 'COMMUNICATION_ARCHITECTURE.md', output: 'communication-architecture.html', eyebrow: 'Architecture Decision Record' },
  { source: 'ENTITY_RELATIONSHIP_SPEC.md', output: 'entity-relationship-spec.html', eyebrow: 'Data Model Specification' },
  { source: 'ONTOLOGY_SPECIFICATION.md', output: 'ontology-specification.html', eyebrow: 'Knowledge Graph Specification' },
  { source: 'SPEAKER_NOTES_CUE_CARDS.md', output: 'speaker-notes-cue-cards.html', eyebrow: 'Presentation Material' }
];

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false
});

/**
 * Escapes text for safe interpolation into HTML text nodes and attribute values.
 *
 * WHAT: Replaces `& < > "` with their character references.
 * WHY: Document titles and intro paragraphs are injected into the hero band and `<title>` outside
 * the Markdown renderer, so they bypass markdown-it's own escaping and must be escaped here.
 *
 * @param value Raw text extracted from the Markdown source.
 * @returns HTML-safe text.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Strips inline Markdown syntax so a heading or paragraph can be used as plain text.
 *
 * WHAT: Removes emphasis markers, inline code backticks, and unwraps `[label](href)` links.
 * WHY: The hero band and `<title>` are plain text; leaving raw `**bold**` or link syntax there
 * would surface literal asterisks and brackets in the browser tab and page header.
 *
 * @param value Markdown-formatted inline text.
 * @returns Plain text equivalent.
 */
function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .trim();
}

/**
 * Rewrites intra-documentation links so generated pages stay inside the HTML portal.
 *
 * WHAT: Points `href="SOME_DOC.md"` at the generated HTML sibling when one exists, and retargets
 * `../README.md` at the repository source browser.
 * WHY: Without this, following a cross-reference from a rendered page would drop the reader back
 * into a file download — reintroducing exactly the problem these pages exist to fix.
 *
 * @param rendered HTML produced by markdown-it.
 * @returns HTML with documentation links normalised.
 */
function rewriteDocLinks(rendered: string): string {
  const mdToHtml = new Map(PAGES.map((p) => [p.source, p.output]));
  // Curated pages that are hand-written rather than generated, but are still valid link targets.
  mdToHtml.set('LEARNING_TOPICS.md', 'learning-topics.html');
  mdToHtml.set('CS_PHD_PERSPECTIVE.md', 'cs-phd-perspective.html');
  mdToHtml.set('RAG_ARCHITECTURE_COMPARISON.md', 'rag-architecture-comparison.html');
  mdToHtml.set('EXPLAINER_WIZARD_OF_OZ.md', 'wizard-of-oz-explainer.html');
  mdToHtml.set('SPEAKER_NOTES.md', 'speaker-notes.html');
  mdToHtml.set('technical-requirements.md', 'technical-requirements.html');

  return rendered.replace(/href="([^"]+)"/g, (whole, href: string) => {
    const [target, hash = ''] = href.split('#');
    const suffix = hash ? `#${hash}` : '';
    const replacement = mdToHtml.get(target);
    if (replacement) {
      return `href="${replacement}${suffix}"`;
    }
    return whole;
  });
}

/**
 * Builds a complete standalone HTML document around rendered Markdown.
 *
 * WHAT: Wraps the body in the portal's shared shell — sticky nav bar, dark hero band, article
 * card, and footer — using the same CSS custom properties and light/dark scheme as the existing
 * hand-authored pages (`learning-topics.html` and friends).
 * WHY: Keeps generated pages visually indistinguishable from curated ones so the documentation
 * hub reads as a single coherent site.
 *
 * @param page Page descriptor being generated.
 * @param title Document title taken from the Markdown H1.
 * @param intro Lead paragraph shown under the hero title.
 * @param bodyHtml Rendered Markdown body.
 * @returns Full HTML document source.
 */
function renderPage(page: DocPage, title: string, intro: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Personal Library</title>
  <!--
    Generated by scripts/generate-doc-pages.ts from docs/${page.source}.
    Do not edit by hand: run \`npm run docs:pages\` to regenerate.
  -->
  <style>
    :root {
      --primary: #2563eb;
      --text: #0f172a;
      --text-muted: #64748b;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --code-bg: #f1f5f9;
      --accent: #3b82f6;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --bg: #0b1120;
        --card-bg: #1e293b;
        --border: #334155;
        --code-bg: #0f172a;
        --accent: #60a5fa;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.65;
    }

    .nav-bar {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .nav-bar a { color: var(--primary); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
    .nav-bar a:hover { text-decoration: underline; }

    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 3rem 2rem 2.5rem;
      text-align: center;
      border-bottom: 3px solid #3b82f6;
    }

    .hero .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.72rem;
      font-weight: 700;
      color: #60a5fa;
      margin-bottom: 0.6rem;
    }

    .hero h1 { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.5rem; }
    .hero p { font-size: 1.05rem; color: #94a3b8; max-width: 820px; margin: 0 auto; }

    .container { max-width: 1000px; margin: 2.5rem auto; padding: 0 1.5rem; }

    article {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
      overflow-wrap: anywhere;
    }

    article h1, article h2, article h3, article h4, article h5, article h6 {
      line-height: 1.3;
      margin: 2rem 0 0.85rem;
    }

    article > :first-child { margin-top: 0; }

    article h1 { font-size: 1.85rem; }

    article h2 {
      font-size: 1.5rem;
      color: var(--accent);
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--border);
    }

    article h3 { font-size: 1.2rem; }
    article h4 { font-size: 1.05rem; color: var(--text-muted); }

    article p { margin-bottom: 1rem; }
    article ul, article ol { margin: 0 0 1rem 1.5rem; }
    article li { margin-bottom: 0.4rem; }
    article a { color: var(--primary); }

    article blockquote {
      background: rgba(59, 130, 246, 0.08);
      border-left: 4px solid var(--primary);
      padding: 0.85rem 1.25rem;
      border-radius: 0 8px 8px 0;
      margin: 0 0 1.25rem;
    }

    article blockquote p:last-child { margin-bottom: 0; }

    article hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

    article img { max-width: 100%; height: auto; }

    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 0.88rem;
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }

    code {
      background: var(--code-bg);
      border: 1px solid var(--border);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 0.88em;
    }

    pre code { background: transparent; border: none; padding: 0; white-space: pre; }

    .table-scroll { overflow-x: auto; margin-bottom: 1.25rem; }

    article table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }

    article th, article td {
      border: 1px solid var(--border);
      padding: 0.55rem 0.75rem;
      text-align: left;
      vertical-align: top;
    }

    article th { background: var(--code-bg); font-weight: 700; }

    footer {
      text-align: center;
      padding: 2.5rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="nav-bar">
    <a href="index.html">&larr; Back to Documentation Hub</a>
    <span style="font-size: 0.85rem; color: var(--text-muted);">Personal Library &amp; AI Research Engine</span>
    <a href="${page.source}" download="${page.source}">Download Markdown &darr;</a>
  </div>

  <div class="hero">
    <div class="eyebrow">${escapeHtml(page.eyebrow)}</div>
    <h1>${escapeHtml(title)}</h1>
    ${intro ? `<p>${escapeHtml(intro)}</p>` : ''}
  </div>

  <div class="container">
    <article>
${bodyHtml}
    </article>
  </div>

  <footer>
    Generated from <code>docs/${page.source}</code> &bull; Personal Library &amp; AI Research Engine &bull;
    Licensed under GNU AGPL v3.0
  </footer>
</body>
</html>
`;
}

/**
 * Converts one Markdown reference into its portal HTML page.
 *
 * WHAT: Extracts the H1 title and lead paragraph for the hero band, renders the remaining Markdown,
 * rewrites cross-document links, and writes the result next to the source file.
 * WHY: The H1/intro are promoted into the hero so the generated page opens with the same visual
 * hierarchy as the hand-authored portal pages instead of a bare wall of text.
 *
 * @param page Page descriptor to build.
 * @returns `true` when the page was written, `false` when the source Markdown is missing.
 */
function buildPage(page: DocPage): boolean {
  const sourcePath = path.join(docsDir, page.source);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`  ! skipped ${page.source} (source not found)`);
    return false;
  }

  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const lines = markdown.split('\n');

  let title = page.source.replace(/\.md$/, '');
  let intro = '';
  let bodyStart = 0;

  const h1Index = lines.findIndex((line) => /^#\s+/.test(line));
  if (h1Index !== -1) {
    title = stripInlineMarkdown(lines[h1Index].replace(/^#\s+/, ''));
    bodyStart = h1Index + 1;

    // Promote the first non-empty, non-heading, non-rule paragraph into the hero subtitle.
    let cursor = bodyStart;
    while (cursor < lines.length && lines[cursor].trim() === '') {
      cursor += 1;
    }
    const candidate = lines[cursor]?.trim() ?? '';
    const isParagraph = candidate !== '' && !candidate.startsWith('#') && !/^(-{3,}|\*{3,}|>|\||```)/.test(candidate);
    if (isParagraph) {
      const paragraph: string[] = [];
      while (cursor < lines.length && lines[cursor].trim() !== '') {
        paragraph.push(lines[cursor].trim());
        cursor += 1;
      }
      intro = stripInlineMarkdown(paragraph.join(' '));
      bodyStart = cursor;
    }
  }

  const body = lines.slice(bodyStart).join('\n');
  let rendered = rewriteDocLinks(md.render(body));
  // Wide specification tables must scroll independently rather than stretching the article card.
  rendered = rendered.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>');

  const indented = rendered
    .split('\n')
    .map((line) => (line.trim() === '' ? line : `      ${line}`))
    .join('\n');

  const outputPath = path.join(docsDir, page.output);
  fs.writeFileSync(outputPath, renderPage(page, title, intro, indented), 'utf8');
  console.log(`  + ${page.output.padEnd(34)} <- ${page.source}`);
  return true;
}

console.log('Generating documentation portal pages from Markdown...');
const written = PAGES.filter(buildPage).length;
console.log(`Done: ${written}/${PAGES.length} page(s) written to docs/.`);
