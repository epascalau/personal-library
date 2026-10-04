/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Project ZIP archive packager for Personal Library.
 * Packages source code, configuration files, and documentation into a single downloadable zip archive.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Packages the entire repository into a downloadable ZIP archive.
 *
 * WHAT:
 * Recursively traverses `projectRoot`, skipping ephemeral directories (`node_modules`, `.git`, `dist`, `.idea`)
 * and self-referential zip files, bundling source files into `personal-library-project.zip`.
 *
 * WHY:
 * 1. Self-contained distribution: Enables developers to download the full, running project source with one click
 * directly from the ShellBar "Developer Tools" menu.
 * 2. Bloat prevention: Excluding `node_modules` and `.git` keeps the generated zip lightweight (~1-2MB instead of >200MB).
 *
 * @returns Absolute filesystem path to the generated zip archive.
 */
export function generateProjectZip(): string {
  const outputPath = path.resolve(projectRoot, 'personal-library-project.zip');
  const zip = new AdmZip();

  const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.idea']);
  const ignoreFiles = new Set(['personal-library-project.zip']);

  /**
   * Recursively traverses local filesystem directories and writes entries into the ZIP bundle.
   *
   * WHAT: Recursively reads entries in `currentDir`, skipping ignored directories, and adds file buffers to `zip`.
   * WHY: Preserves full project directory structure and relative file paths without copying transient build artifacts.
   */
  function addDirRecursive(currentDir: string, zipDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) {
          addDirRecursive(
            path.join(currentDir, entry.name),
            zipDir ? `${zipDir}/${entry.name}` : entry.name
          );
        }
      } else {
        if (!ignoreFiles.has(entry.name)) {
          const filePath = path.join(currentDir, entry.name);
          const zipPath = zipDir ? `${zipDir}` : '';
          try {
            const content = fs.readFileSync(filePath);
            zip.addFile(zipPath ? `${zipPath}/${entry.name}` : entry.name, content);
          } catch (err) {
            // ignore unreadable files
          }
        }
      }
    }
  }

  addDirRecursive(projectRoot, '');
  zip.writeZip(outputPath);
  return outputPath;
}
