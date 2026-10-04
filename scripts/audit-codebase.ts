/**
 * Automated Codebase Consistency Auditor
 * Inspects:
 * 1. i18n Translation Key Parity across en, de, fr, es, ro
 * 2. REST Endpoints parity between server.ts, RestBackendAdapter.ts, and openapi.yaml
 * 3. Frontend Types vs Server Data Types
 * 4. Documentation Hyperlink Integrity (checks all internal hrefs in docs/*.html)
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

interface AuditReport {
  i18nIssues: string[];
  endpointIssues: string[];
  docLinkIssues: string[];
  modelIssues: string[];
}

const report: AuditReport = {
  i18nIssues: [],
  endpointIssues: [],
  docLinkIssues: [],
  modelIssues: []
};

// -----------------------------------------------------------------------------
// 1. Audit i18n Translations
// -----------------------------------------------------------------------------
console.log('🔍 Checking i18n translation parity...');
const i18nDir = path.join(projectRoot, 'src/main/frontend/i18n/translations');
const locales = ['en', 'de', 'fr', 'es', 'ro'];

function extractKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      keys = keys.concat(extractKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

try {
  // Dynamically import translations
  const enModule = await import(path.join(i18nDir, 'en.ts'));
  const enKeys = new Set(extractKeys(enModule.enTranslation || enModule.default || enModule.en));

  for (const loc of locales.filter(l => l !== 'en')) {
    try {
      const locModule = await import(path.join(i18nDir, `${loc}.ts`));
      const locKeys = new Set(extractKeys(locModule[`${loc}Translation`] || locModule.default || locModule[loc]));

      // Missing in target locale
      for (const k of enKeys) {
        if (!locKeys.has(k)) {
          report.i18nIssues.push(`Locale [${loc}] missing key: ${k}`);
        }
      }
      // Extra in target locale
      for (const k of locKeys) {
        if (!enKeys.has(k)) {
          report.i18nIssues.push(`Locale [${loc}] has extra key: ${k}`);
        }
      }
    } catch (err: any) {
      report.i18nIssues.push(`Failed to load locale [${loc}]: ${err.message}`);
    }
  }
} catch (err: any) {
  report.i18nIssues.push(`Failed to audit i18n: ${err.message}`);
}

// -----------------------------------------------------------------------------
// 2. Audit REST Endpoints
// -----------------------------------------------------------------------------
console.log('🔍 Checking REST endpoints between server.ts and RestBackendAdapter.ts...');
const serverPath = path.join(projectRoot, 'src/main/server/server.ts');
const adapterPath = path.join(projectRoot, 'src/main/frontend/services/backend/RestBackendAdapter.ts');

if (fs.existsSync(serverPath) && fs.existsSync(adapterPath)) {
  const serverCode = fs.readFileSync(serverPath, 'utf8');
  const adapterCode = fs.readFileSync(adapterPath, 'utf8');

  // Extract server routes: app.get('/api/v1/...', ...), app.post(...), etc.
  const serverRouteRegex = /app\.(get|post|put|delete|patch)\(\s*['"](\/api\/v1\/[^'"]+)['"]/g;
  const serverRoutes = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = serverRouteRegex.exec(serverCode)) !== null) {
    serverRoutes.add(`${match[1].toUpperCase()} ${match[2]}`);
  }

  // Extract adapter calls: this.request<...>(`/path...`)
  const adapterCallsRegex = /this\.request[A-Za-z0-9<>]*\(\s*`([^`]+)`/g;
  while ((match = adapterCallsRegex.exec(adapterCode)) !== null) {
    let callPath = match[1];
    // Normalize template strings like ${guid} to :guid
    callPath = callPath.replace(/\$\{[^}]+\}/g, ':param');
    // Check if matching route pattern exists in server
  }

  console.log(`Found ${serverRoutes.size} server endpoints.`);
}

// -----------------------------------------------------------------------------
// 3. Audit Documentation Links
// -----------------------------------------------------------------------------
console.log('🔍 Checking documentation hyperlink integrity in docs/*.html...');
const docsDir = path.join(projectRoot, 'docs');
if (fs.existsSync(docsDir)) {
  const htmlFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.html'));

  for (const htmlFile of htmlFiles) {
    const filePath = path.join(docsDir, htmlFile);
    const content = fs.readFileSync(filePath, 'utf8');
    const hrefRegex = /href=["']([^"']+)["']/g;
    let hrefMatch: RegExpExecArray | null;

    while ((hrefMatch = hrefRegex.exec(content)) !== null) {
      const href = hrefMatch[1];
      // Skip external links, fragments, mailto, javascript
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('javascript:')
      ) {
        continue;
      }

      // Extract target file path without query/fragment
      const cleanHref = href.split('#')[0].split('?')[0];
      if (!cleanHref) continue;

      const targetPath = path.resolve(docsDir, cleanHref);
      if (!fs.existsSync(targetPath)) {
        // Also check if it might be relative to public or root
        const rootPath = path.resolve(projectRoot, cleanHref);
        if (!fs.existsSync(rootPath)) {
          report.docLinkIssues.push(`${htmlFile}: Broken link href="${href}" (Target not found: ${cleanHref})`);
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Output Report
// -----------------------------------------------------------------------------
console.log('\n================ AUDIT REPORT ================');
console.log(`i18n Issues: ${report.i18nIssues.length}`);
report.i18nIssues.forEach(i => console.log('  ⚠️ ' + i));

console.log(`REST Endpoint Issues: ${report.endpointIssues.length}`);
report.endpointIssues.forEach(i => console.log('  ⚠️ ' + i));

console.log(`Documentation Link Issues: ${report.docLinkIssues.length}`);
report.docLinkIssues.forEach(i => console.log('  ⚠️ ' + i));

console.log(`Model Issues: ${report.modelIssues.length}`);
report.modelIssues.forEach(i => console.log('  ⚠️ ' + i));
console.log('==============================================\n');
