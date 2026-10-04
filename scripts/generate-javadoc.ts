/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Javadoc HTML Documentation Generator for Personal Library Java backend.
 * Parses all Java source files under src/main/java/com/personallibrary/,
 * extracts package declarations, class structures, fields, constructors, methods,
 * Spring/Lombok annotations, and Javadoc comment tags (@param, @return, @throws, @author, @version),
 * and generates standard, linked HTML Javadoc reference documentation in docs/javadoc/.
 */

import * as fs from 'fs';
import * as path from 'path';

interface JavaParamDoc {
  name: string;
  description: string;
}

interface JavaThrowsDoc {
  exception: string;
  description: string;
}

interface JavaMethodDoc {
  name: string;
  returnType: string;
  modifiers: string;
  annotations: string[];
  parameters: { type: string; name: string }[];
  description: string;
  params: JavaParamDoc[];
  returnDoc?: string;
  throwsList: JavaThrowsDoc[];
}

interface JavaFieldDoc {
  name: string;
  type: string;
  modifiers: string;
  annotations: string[];
  description: string;
}

interface JavaConstructorDoc {
  name: string;
  modifiers: string;
  parameters: { type: string; name: string }[];
  description: string;
  params: JavaParamDoc[];
  throwsList: JavaThrowsDoc[];
}

interface JavaClassDoc {
  filePath: string;
  packageName: string;
  className: string;
  classKind: 'class' | 'interface' | 'enum' | 'record';
  modifiers: string;
  annotations: string[];
  extendsClass?: string;
  implementsInterfaces: string[];
  description: string;
  author?: string;
  version?: string;
  since?: string;
  fields: JavaFieldDoc[];
  constructors: JavaConstructorDoc[];
  methods: JavaMethodDoc[];
}

const JAVA_SRC_DIR = path.resolve('src/main/java');
const JAVADOC_OUT_DIR = path.resolve('docs/javadoc');

/**
 * Parses raw Javadoc multiline block comments into structured metadata.
 *
 * WHAT: Strips asterisks and delimiters, extracting descriptions along with standard `@author`, `@version`,
 * `@since`, `@return`, `@param`, and `@throws` tags.
 * WHY: Provides structured inputs for rendering standard Javadoc HTML summary tables and parameter detail lists.
 *
 * @param rawDoc Raw comment text starting with /** and ending with *.
 * @returns Structured Javadoc tag metadata object.
 */
function parseJavadoc(rawDoc: string): {
  description: string;
  author?: string;
  version?: string;
  since?: string;
  params: JavaParamDoc[];
  returnDoc?: string;
  throwsList: JavaThrowsDoc[];
} {
  const lines = rawDoc
    .replace(/^\/\*\*|\*\/$/g, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trim());

  const descLines: string[] = [];
  let author: string | undefined;
  let version: string | undefined;
  let since: string | undefined;
  let returnDoc: string | undefined;
  const params: JavaParamDoc[] = [];
  const throwsList: JavaThrowsDoc[] = [];

  for (const line of lines) {
    if (!line) {
      if (descLines.length > 0 && !descLines[descLines.length - 1].endsWith('\n')) {
        descLines.push('');
      }
      continue;
    }

    if (line.startsWith('@author')) {
      author = line.replace('@author', '').trim();
    } else if (line.startsWith('@version')) {
      version = line.replace('@version', '').trim();
    } else if (line.startsWith('@since')) {
      since = line.replace('@since', '').trim();
    } else if (line.startsWith('@return')) {
      returnDoc = line.replace('@return', '').trim();
    } else if (line.startsWith('@param')) {
      const match = line.match(/^@param\s+([A-Za-z0-9_<>]+)\s*(.*)$/);
      if (match) {
        params.push({ name: match[1], description: match[2] || '' });
      }
    } else if (line.startsWith('@throws') || line.startsWith('@exception')) {
      const match = line.match(/^@(throws|exception)\s+([A-Za-z0-9_]+)\s*(.*)$/);
      if (match) {
        throwsList.push({ exception: match[2], description: match[3] || '' });
      }
    } else if (!line.startsWith('@')) {
      descLines.push(line);
    }
  }

  return {
    description: descLines.join(' ').trim(),
    author,
    version,
    since,
    params,
    returnDoc,
    throwsList
  };
}

/**
 * Parses a single Java source file into an AST-like representation of class metadata, fields, and methods.
 *
 * WHAT: Reads Java file contents, extracts package declarations, imports, class annotations, modifiers,
 * constructors, fields, and method signatures along with their associated Javadoc comments.
 * WHY: Enables zero-dependency Javadoc generation in environments without an external JDK or `javadoc` tool binary.
 *
 * @param filePath Path to the target .java source file.
 * @returns Parsed JavaClassDoc structure, or null if no class definition is found.
 */
function parseJavaFile(filePath: string): JavaClassDoc | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let packageName = 'default';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('package ') && trimmed.endsWith(';')) {
      packageName = trimmed.slice(8, -1).trim();
      break;
    }
  }

  let inClass = false;
  let classDocRaw = '';
  let collectingDoc = false;
  let currentDoc = '';
  let currentAnnotations: string[] = [];

  let className = '';
  let classKind: 'class' | 'interface' | 'enum' | 'record' = 'class';
  let classModifiers = 'public';
  let classAnnotations: string[] = [];
  let extendsClass: string | undefined;
  let implementsInterfaces: string[] = [];
  let classDescription = '';
  let classAuthor: string | undefined;
  let classVersion: string | undefined;
  let classSince: string | undefined;

  const fields: JavaFieldDoc[] = [];
  const constructors: JavaConstructorDoc[] = [];
  const methods: JavaMethodDoc[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Javadoc start
    if (trimmed.startsWith('/**')) {
      collectingDoc = true;
      currentDoc = trimmed + '\n';
      if (trimmed.endsWith('*/')) {
        collectingDoc = false;
      }
      continue;
    }

    if (collectingDoc) {
      currentDoc += trimmed + '\n';
      if (trimmed.endsWith('*/')) {
        collectingDoc = false;
      }
      continue;
    }

    // Annotations
    if (trimmed.startsWith('@')) {
      currentAnnotations.push(trimmed);
      continue;
    }

    // Skip imports and package
    if (trimmed.startsWith('import ') || trimmed.startsWith('package ') || !trimmed) {
      if (!collectingDoc && !trimmed.startsWith('@')) {
        currentAnnotations = [];
        currentDoc = '';
      }
      continue;
    }

    // Detect Class/Interface/Enum declaration if not yet inClass
    if (!inClass) {
      const classMatch = trimmed.match(/(public|protected|private)?\s*(abstract|final|static)?\s*(class|interface|enum|record)\s+([A-Za-z0-9_]+)(?:<[^>]+>)?(?:\s+extends\s+([A-Za-z0-9_.]+))?(?:\s+implements\s+([A-Za-z0-9_.,\s]+))?/);
      if (classMatch) {
        inClass = true;
        classModifiers = [classMatch[1] || 'public', classMatch[2] || ''].filter(Boolean).join(' ');
        classKind = classMatch[3] as any;
        className = classMatch[4];
        extendsClass = classMatch[5];
        if (classMatch[6]) {
          implementsInterfaces = classMatch[6].split(',').map(s => s.trim()).filter(Boolean);
        }

        classAnnotations = [...currentAnnotations];
        const parsed = parseJavadoc(currentDoc);
        classDescription = parsed.description;
        classAuthor = parsed.author;
        classVersion = parsed.version;
        classSince = parsed.since;

        currentDoc = '';
        currentAnnotations = [];
        continue;
      }
    } else {
      // Inside class body
      // Check for methods: contains '(' and ')'
      if (trimmed.includes('(') && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        // Collect full signature if multi-line
        let sig = trimmed;
        while (!sig.includes(')') && i + 1 < lines.length) {
          i++;
          sig += ' ' + lines[i].trim();
        }

        const methodMatch = sig.match(/(public|protected|private)?\s*(static|final|synchronized|abstract|\s)*\s*([A-Za-z0-9_<>[\]]+)?\s*([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
        if (methodMatch) {
          const access = methodMatch[1] || 'public';
          const otherMod = (methodMatch[2] || '').trim();
          const modifiers = [access, otherMod].filter(Boolean).join(' ');
          const typeOrRet = methodMatch[3] || 'void';
          const name = methodMatch[4];
          const rawParams = methodMatch[5] || '';

          const paramList = rawParams
            .split(',')
            .map(p => p.trim())
            .filter(Boolean)
            .map(p => {
              const cleaned = p.replace(/@[A-Za-z0-9_()".=\s,]+\s*/g, '').trim();
              const parts = cleaned.split(/\s+/);
              return {
                type: parts.slice(0, -1).join(' ') || 'Object',
                name: parts[parts.length - 1] || 'param'
              };
            });

          const parsed = parseJavadoc(currentDoc);

          if (name === className) {
            constructors.push({
              name,
              modifiers,
              parameters: paramList,
              description: parsed.description,
              params: parsed.params,
              throwsList: parsed.throwsList
            });
          } else {
            methods.push({
              name,
              returnType: typeOrRet,
              modifiers,
              annotations: [...currentAnnotations],
              parameters: paramList,
              description: parsed.description,
              params: parsed.params,
              returnDoc: parsed.returnDoc,
              throwsList: parsed.throwsList
            });
          }

          currentDoc = '';
          currentAnnotations = [];
          continue;
        }
      }

      // Check for fields: ends with ';' and doesn't contain '('
      if (trimmed.endsWith(';') && !trimmed.includes('(')) {
        const fieldMatch = trimmed.match(/(public|protected|private)?\s*(static|final|\s)*\s*([A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)(?:\s*=.*)?;$/);
        if (fieldMatch) {
          const access = fieldMatch[1] || 'private';
          const otherMod = (fieldMatch[2] || '').trim();
          const modifiers = [access, otherMod].filter(Boolean).join(' ');
          const type = fieldMatch[3];
          const name = fieldMatch[4];
          const parsed = parseJavadoc(currentDoc);

          fields.push({
            name,
            type,
            modifiers,
            annotations: [...currentAnnotations],
            description: parsed.description
          });

          currentDoc = '';
          currentAnnotations = [];
          continue;
        }
      }
    }
  }

  if (!className) {
    return null;
  }

  return {
    filePath,
    packageName,
    className,
    classKind,
    modifiers: classModifiers,
    annotations: classAnnotations,
    extendsClass,
    implementsInterfaces,
    description: classDescription,
    author: classAuthor,
    version: classVersion,
    since: classSince,
    fields,
    constructors,
    methods
  };
}

/**
 * Recursively locates all .java files under the target directory.
 *
 * WHAT: Traverses subdirectories recursively, accumulating absolute paths to `.java` source files.
 * WHY: Discovers all Java sources across arbitrarily nested package hierarchies without hardcoding package paths.
 *
 * @param dir Starting filesystem directory path.
 * @returns Array of absolute paths to all matching Java files.
 */
function walkDir(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(full));
    } else if (file.endsWith('.java')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Escapes unsafe HTML characters to prevent XSS vulnerabilities in generated documentation.
 *
 * WHAT: Replaces ampersands, angle brackets, and quotes with standard HTML entities.
 * WHY: Java source code frequently contains generics (`List<String>`) and code examples that would break
 * HTML page rendering or introduce script injection if unescaped.
 *
 * @param str Raw string containing potential HTML metacharacters.
 * @returns Safe HTML-encoded string.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const JAVADOC_CSS = `
body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.6;
}

header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  padding: 1.25rem 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

header h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

header .subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

nav.top-nav {
  background: #1e293b;
  border-bottom: 2px solid #3b82f6;
  padding: 0.5rem 2rem;
  display: flex;
  gap: 1.5rem;
  font-size: 0.85rem;
}

nav.top-nav a {
  color: #cbd5e1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

nav.top-nav a:hover, nav.top-nav a.active {
  color: #38bdf8;
}

.container {
  max-width: 1280px;
  margin: 2rem auto;
  padding: 0 1.5rem;
}

.card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  padding: 2rem;
  margin-bottom: 2rem;
}

.breadcrumb {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 1rem;
}

.breadcrumb a {
  color: #2563eb;
  text-decoration: none;
}

.class-header {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}

.class-header .package-label {
  font-size: 0.9rem;
  color: #64748b;
  font-family: monospace;
}

.class-header h2 {
  margin: 0.4rem 0;
  font-size: 1.8rem;
  color: #0f172a;
}

.signature {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  color: #0f172a;
  overflow-x: auto;
  margin: 1rem 0;
}

.annotation {
  color: #8b5cf6;
  font-weight: 600;
}

.meta-tags {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #475569;
}

.tag-badge {
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: 500;
}

table.summary-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.875rem;
}

table.summary-table th {
  background: #f8fafc;
  color: #475569;
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
}

table.summary-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

table.summary-table tr:hover {
  background-color: #f8fafc;
}

.type-col {
  width: 25%;
  font-family: monospace;
  color: #0369a1;
}

.name-col {
  width: 25%;
  font-weight: 600;
}

.name-col a {
  color: #2563eb;
  text-decoration: none;
}

.name-col a:hover {
  text-decoration: underline;
}

.desc-col {
  color: #334155;
}

.detail-block {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
  margin-top: 1.5rem;
}

.detail-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.param-list {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.param-list dt {
  font-weight: 600;
  color: #1e293b;
  margin-top: 0.5rem;
}

.param-list dd {
  margin-left: 1rem;
  color: #475569;
}

footer {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.85rem;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}
`;

/**
 * Generates the complete HTML reference page for a single Java class or interface.
 *
 * WHAT: Emits HTML markup with navigation headers, class inheritance signatures, annotations,
 * field summary tables, constructor summaries, method signature details, parameter tags, and throws declarations.
 * WHY: Recreates the standard, universally recognizable Javadoc specification format in clean, responsive HTML.
 *
 * @param classDoc Parsed Java class descriptor.
 * @returns Fully formatted HTML document string.
 */
function generateClassHtml(classDoc: JavaClassDoc): string {
  const relativeRoot = '../../';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${classDoc.className} (${classDoc.packageName}) - Personal Library Javadoc</title>
  <link rel="stylesheet" href="${relativeRoot}stylesheet.css">
</head>
<body>
  <header>
    <h1>Personal Library Java Backend API Reference</h1>
    <div class="subtitle">Spring Boot 3 • Spring AI • Ollama • MongoDB • Qdrant Vector Engine</div>
  </header>
  <nav class="top-nav">
    <a href="${relativeRoot}index.html">Overview</a>
    <a href="${relativeRoot}packages/${classDoc.packageName}.html">Package</a>
    <a href="#" class="active">Class</a>
    <a href="${relativeRoot}tree.html">Tree</a>
    <a href="../typescript/index.html" target="_blank">TypeScript API ↗</a>
  </nav>

  <div class="container">
    <div class="breadcrumb">
      <a href="${relativeRoot}index.html">All Packages</a> &gt;
      <a href="${relativeRoot}packages/${classDoc.packageName}.html">${classDoc.packageName}</a> &gt;
      <strong>${classDoc.className}</strong>
    </div>

    <div class="card">
      <div class="class-header">
        <div class="package-label">package ${classDoc.packageName}</div>
        <h2>${classDoc.classKind} ${classDoc.className}</h2>
        ${classDoc.annotations.length > 0 ? `<div style="margin-bottom: 0.5rem;">${classDoc.annotations.map(a => `<span class="annotation">${escapeHtml(a)}</span> `).join(' ')}</div>` : ''}
        <div class="signature">
          ${escapeHtml(classDoc.modifiers)} ${classDoc.classKind} <strong>${classDoc.className}</strong>
          ${classDoc.extendsClass ? `extends ${escapeHtml(classDoc.extendsClass)}` : ''}
          ${classDoc.implementsInterfaces.length > 0 ? `implements ${escapeHtml(classDoc.implementsInterfaces.join(', '))}` : ''}
        </div>
        <p>${escapeHtml(classDoc.description || 'No description provided.')}</p>
        <div class="meta-tags">
          ${classDoc.author ? `<span class="tag-badge">Author: ${escapeHtml(classDoc.author)}</span>` : ''}
          ${classDoc.version ? `<span class="tag-badge">Version: ${escapeHtml(classDoc.version)}</span>` : ''}
          ${classDoc.since ? `<span class="tag-badge">Since: ${escapeHtml(classDoc.since)}</span>` : ''}
        </div>
      </div>

      <!-- Field Summary -->
      ${classDoc.fields.length > 0 ? `
        <h3>Field Summary</h3>
        <table class="summary-table">
          <thead>
            <tr>
              <th class="type-col">Modifier and Type</th>
              <th class="name-col">Field</th>
              <th class="desc-col">Description</th>
            </tr>
          </thead>
          <tbody>
            ${classDoc.fields.map(f => `
              <tr>
                <td class="type-col">${escapeHtml(f.modifiers)} ${escapeHtml(f.type)}</td>
                <td class="name-col"><code>${escapeHtml(f.name)}</code></td>
                <td class="desc-col">${escapeHtml(f.description || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- Constructor Summary -->
      ${classDoc.constructors.length > 0 ? `
        <h3>Constructor Summary</h3>
        <table class="summary-table">
          <thead>
            <tr>
              <th class="name-col">Constructor</th>
              <th class="desc-col">Description</th>
            </tr>
          </thead>
          <tbody>
            ${classDoc.constructors.map(c => `
              <tr>
                <td class="name-col"><code>${escapeHtml(c.name)}(${escapeHtml(c.parameters.map(p => `${p.type} ${p.name}`).join(', '))})</code></td>
                <td class="desc-col">${escapeHtml(c.description || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- Method Summary -->
      ${classDoc.methods.length > 0 ? `
        <h3>Method Summary</h3>
        <table class="summary-table">
          <thead>
            <tr>
              <th class="type-col">Modifier and Type</th>
              <th class="name-col">Method and Description</th>
            </tr>
          </thead>
          <tbody>
            ${classDoc.methods.map((m, idx) => `
              <tr>
                <td class="type-col">${escapeHtml(m.modifiers)} ${escapeHtml(m.returnType)}</td>
                <td class="desc-col">
                  <strong><a href="#method-${idx}">${escapeHtml(m.name)}</a></strong>(${escapeHtml(m.parameters.map(p => `${p.type} ${p.name}`).join(', '))})
                  <div style="font-size: 0.85rem; color: #475569; margin-top: 0.25rem;">${escapeHtml(m.description || '-')}</div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Method Details -->
        <h3>Method Details</h3>
        ${classDoc.methods.map((m, idx) => `
          <div class="detail-block" id="method-${idx}">
            <div class="detail-title">${escapeHtml(m.name)}</div>
            ${m.annotations.length > 0 ? `<div>${m.annotations.map(a => `<span class="annotation">${escapeHtml(a)}</span> `).join(' ')}</div>` : ''}
            <div class="signature">
              ${escapeHtml(m.modifiers)} ${escapeHtml(m.returnType)} <strong>${escapeHtml(m.name)}</strong>(${escapeHtml(m.parameters.map(p => `${p.type} ${p.name}`).join(', '))})
            </div>
            <p>${escapeHtml(m.description || 'No description provided.')}</p>

            ${m.params.length > 0 ? `
              <dl class="param-list">
                <dt>Parameters:</dt>
                ${m.params.map(p => `<dd><code>${escapeHtml(p.name)}</code> - ${escapeHtml(p.description)}</dd>`).join('')}
              </dl>
            ` : ''}

            ${m.returnDoc ? `
              <dl class="param-list">
                <dt>Returns:</dt>
                <dd>${escapeHtml(m.returnDoc)}</dd>
              </dl>
            ` : ''}

            ${m.throwsList.length > 0 ? `
              <dl class="param-list">
                <dt>Throws:</dt>
                ${m.throwsList.map(t => `<dd><code>${escapeHtml(t.exception)}</code> - ${escapeHtml(t.description)}</dd>`).join('')}
              </dl>
            ` : ''}
          </div>
        `).join('')}
      ` : ''}
    </div>
  </div>

  <footer>Personal Library API Reference • Generated with Javadoc Generator for Spring Boot</footer>
</body>
</html>`;
}

/**
 * Generates an HTML package summary listing all classes and interfaces in a Java package.
 *
 * WHAT: Emits an HTML overview page containing a table of classes, class kinds, and descriptions for the package.
 * WHY: Replicates the classic Javadoc package-summary view for module-level architectural exploration.
 *
 * @param pkgName Package identifier (e.g. "com.personallibrary.service").
 * @param classes List of parsed classes belonging to this package.
 * @returns Fully formatted HTML document string.
 */
function generatePackageHtml(pkgName: string, classes: JavaClassDoc[]): string {
  const relativeRoot = '../';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Package ${pkgName} - Personal Library Javadoc</title>
  <link rel="stylesheet" href="${relativeRoot}stylesheet.css">
</head>
<body>
  <header>
    <h1>Personal Library Java Backend API Reference</h1>
    <div class="subtitle">Spring Boot 3 • Spring AI • Ollama • MongoDB • Qdrant Vector Engine</div>
  </header>
  <nav class="top-nav">
    <a href="${relativeRoot}index.html">Overview</a>
    <a href="#" class="active">Package</a>
    <a href="${relativeRoot}tree.html">Tree</a>
    <a href="../typescript/index.html" target="_blank">TypeScript API ↗</a>
  </nav>

  <div class="container">
    <div class="breadcrumb">
      <a href="${relativeRoot}index.html">All Packages</a> &gt;
      <strong>${pkgName}</strong>
    </div>

    <div class="card">
      <div class="class-header">
        <h2>Package ${pkgName}</h2>
        <p>Classes, entities, and services in <code>${pkgName}</code>.</p>
      </div>

      <table class="summary-table">
        <thead>
          <tr>
            <th class="name-col" style="width: 30%;">Class / Interface</th>
            <th class="desc-col">Description</th>
          </tr>
        </thead>
        <tbody>
          ${classes.map(c => `
            <tr>
              <td class="name-col">
                <span class="tag-badge" style="font-size: 0.75rem; margin-right: 0.5rem;">${c.classKind}</span>
                <a href="${relativeRoot}classes/${c.packageName}/${c.className}.html">${c.className}</a>
              </td>
              <td class="desc-col">${escapeHtml(c.description || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <footer>Personal Library API Reference • Generated with Javadoc Generator for Spring Boot</footer>
</body>
</html>`;
}

/**
 * Returns architectural purpose and responsibility summary for a given package.
 *
 * WHAT: Maps package identifier string to human-readable component narrative and architectural role.
 * WHY: Provides context on what each architectural tier does (controllers, services, repositories, DTOs, configs).
 *
 * @param pkg Java package name.
 * @returns HTML description snippet.
 */
function getPackageDescription(pkg: string): string {
  switch (pkg) {
    case 'com.personallibrary':
      return 'Application entrypoint and root Spring Boot <code>@SpringBootApplication</code> bootstrap.';
    case 'com.personallibrary.config':
      return 'Security configuration (Keycloak OIDC JWT validation), OpenAPI documentation, and Spring AI Ollama configuration.';
    case 'com.personallibrary.controller':
      return 'REST Controllers implementing the SAP Horizon floorplan endpoints for List Report, Object Page, Upload, and Auth.';
    case 'com.personallibrary.dto':
      return 'Data Transfer Objects (DTOs) for requests, responses, pagination, summaries, and conversational chat payloads.';
    case 'com.personallibrary.model':
      return 'MongoDB document entities, BibTeX metadata records, chunk models for vector indexing, and duration-tracked summary records.';
    case 'com.personallibrary.repository':
      return 'Spring Data MongoDB repositories and custom <code>MongoTemplate</code> dynamic search query fragments.';
    case 'com.personallibrary.service':
      return 'Core business logic: document ingestion, vector RAG indexing, dual-model AI summarization, BibTeX extraction, and asset storage.';
    default:
      return 'Component package for Personal Library.';
  }
}

/**
 * Generates the top-level index.html overview page summarizing system packages.
 *
 * WHAT: Assembles overview statistics (total packages, classes), architecture synopsis, and package directory links.
 * WHY: Provides the landing page for Javadoc documentation, linking to packages, hierarchy tree, and TypeScript API docs.
 *
 * @param packages Map of package names to their parsed class lists.
 * @returns Fully formatted HTML document string.
 */
function generateIndexHtml(packages: Map<string, JavaClassDoc[]>): string {
  const allCount = Array.from(packages.values()).reduce((sum, list) => sum + list.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Overview - Personal Library Java Backend API Reference</title>
  <link rel="stylesheet" href="stylesheet.css">
</head>
<body>
  <header>
    <h1>Personal Library Java Backend API Reference (Javadoc)</h1>
    <div class="subtitle">Spring Boot 3.3.4 • Spring AI • Ollama Dual-Model • MongoDB • Qdrant Vector Retrieval</div>
  </header>
  <nav class="top-nav">
    <a href="index.html" class="active">Overview</a>
    <a href="tree.html">Tree</a>
    <a href="../typescript/index.html" target="_blank">TypeScript Frontend API ↗</a>
    <a href="/api/v1/openapi.yaml" target="_blank">OpenAPI 3.0 Spec ↗</a>
  </nav>

  <div class="container">
    <div class="card">
      <h2>System Architecture & Package Overview</h2>
      <p>
        The Personal Library backend is an enterprise-grade document management and generative AI service
        orchestrating automated BibTeX metadata extraction, dual-model analytical summaries (Ollama Llama 3.3 and Mistral Large),
        in-place GUID version management, and high-precision RAG vector retrieval using Qdrant.
      </p>

      <div style="display: flex; gap: 1rem; margin: 1.5rem 0;">
        <span class="tag-badge" style="font-size: 0.9rem; padding: 0.4rem 0.8rem;">📦 ${packages.size} Packages</span>
        <span class="tag-badge" style="font-size: 0.9rem; padding: 0.4rem 0.8rem; background: #fef3c7; color: #92400e;">☕ ${allCount} Java Classes</span>
        <span class="tag-badge" style="font-size: 0.9rem; padding: 0.4rem 0.8rem; background: #dcfce7; color: #166534;">🛡️ Keycloak OAuth2 Resource Server</span>
      </div>

      <h3>Packages</h3>
      <table class="summary-table">
        <thead>
          <tr>
            <th class="name-col" style="width: 35%;">Package</th>
            <th class="desc-col">Description & Component Scope</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(packages.entries()).map(([pkg, classes]) => `
            <tr>
              <td class="name-col">
                <a href="packages/${pkg}.html"><strong>${pkg}</strong></a>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.2rem;">${classes.length} classes / interfaces</div>
              </td>
              <td class="desc-col">
                ${getPackageDescription(pkg)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <footer>Personal Library API Reference • Generated with Javadoc Generator for Spring Boot</footer>
</body>
</html>`;
}

/**
 * Generates an HTML hierarchy tree depicting class and interface inheritance.
 *
 * WHAT: Emits an HTML tree structured under `java.lang.Object` listing all parsed classes and implemented interfaces.
 * WHY: Recreates the standard Javadoc tree.html page for understanding class inheritance relationships at a glance.
 *
 * @param allClasses Full collection of all parsed JavaClassDoc structures.
 * @returns Fully formatted HTML document string.
 */
function generateTreeHtml(allClasses: JavaClassDoc[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Class Hierarchy Tree - Personal Library Javadoc</title>
  <link rel="stylesheet" href="stylesheet.css">
</head>
<body>
  <header>
    <h1>Personal Library Java Backend API Reference</h1>
    <div class="subtitle">Class Hierarchy Tree</div>
  </header>
  <nav class="top-nav">
    <a href="index.html">Overview</a>
    <a href="#" class="active">Tree</a>
    <a href="../typescript/index.html" target="_blank">TypeScript API ↗</a>
  </nav>

  <div class="container">
    <div class="card">
      <h2>Class Hierarchy</h2>
      <ul>
        <li><code>java.lang.Object</code>
          <ul>
            ${allClasses.map(c => `
              <li>
                <span class="tag-badge" style="font-size: 0.7rem;">${c.classKind}</span>
                <a href="classes/${c.packageName}/${c.className}.html"><strong>${c.packageName}.${c.className}</strong></a>
                ${c.implementsInterfaces.length > 0 ? `(implements <code>${c.implementsInterfaces.join(', ')}</code>)` : ''}
              </li>
            `).join('')}
          </ul>
        </li>
      </ul>
    </div>
  </div>

  <footer>Personal Library API Reference • Generated with Javadoc Generator for Spring Boot</footer>
</body>
</html>`;
}

/**
 * Main execution orchestrator for Javadoc generation.
 *
 * WHAT: Scans Java source directory, parses each file, groups by package, creates output directories,
 * and writes stylesheet.css, package HTML files, class HTML files, index.html overview, and tree.html hierarchy.
 * WHY: Automates creation of static Javadoc website during project builds and container startup without external toolchains.
 */
function main() {
  console.log('🔍 Scanning Java files in:', JAVA_SRC_DIR);
  const files = walkDir(JAVA_SRC_DIR);
  console.log(`Found ${files.length} Java source files.`);

  const classes: JavaClassDoc[] = [];
  for (const f of files) {
    const doc = parseJavaFile(f);
    if (doc) {
      classes.push(doc);
    }
  }

  console.log(`Parsed ${classes.length} Java classes, entities, and services.`);

  // Group by package
  const packageMap = new Map<string, JavaClassDoc[]>();
  for (const c of classes) {
    if (!packageMap.has(c.packageName)) {
      packageMap.set(c.packageName, []);
    }
    packageMap.get(c.packageName)!.push(c);
  }

  // Ensure output directory exists
  fs.mkdirSync(JAVADOC_OUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(JAVADOC_OUT_DIR, 'packages'), { recursive: true });

  // Write stylesheet
  fs.writeFileSync(path.join(JAVADOC_OUT_DIR, 'stylesheet.css'), JAVADOC_CSS, 'utf-8');

  // Write class files
  for (const c of classes) {
    const classDir = path.join(JAVADOC_OUT_DIR, 'classes', c.packageName);
    fs.mkdirSync(classDir, { recursive: true });
    const classHtml = generateClassHtml(c);
    fs.writeFileSync(path.join(classDir, `${c.className}.html`), classHtml, 'utf-8');
  }

  // Write package files
  for (const [pkg, pkgClasses] of packageMap.entries()) {
    const pkgHtml = generatePackageHtml(pkg, pkgClasses);
    fs.writeFileSync(path.join(JAVADOC_OUT_DIR, 'packages', `${pkg}.html`), pkgHtml, 'utf-8');
  }

  // Write index overview & tree
  fs.writeFileSync(path.join(JAVADOC_OUT_DIR, 'index.html'), generateIndexHtml(packageMap), 'utf-8');
  fs.writeFileSync(path.join(JAVADOC_OUT_DIR, 'tree.html'), generateTreeHtml(classes), 'utf-8');

  console.log('✅ Javadoc HTML documentation generated at:', JAVADOC_OUT_DIR);
}

main();
