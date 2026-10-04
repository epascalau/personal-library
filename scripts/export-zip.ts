/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Project ZIP archive packager for Personal Library.
 * Packages source code, configuration files, and documentation into a single downloadable zip archive.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Builds an AdmZip instance containing the clean project source code.
 *
 * WHAT: Recursively traverses `projectRoot`, skipping ephemeral directories (`node_modules`, `.git`, `dist`, `target`)
 * and archive files.
 * WHY: Generates a lightweight, pristine archive of the project source code for developer export.
 */
export function buildProjectZipInstance(): AdmZip {
  const zip = new AdmZip();

  const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'target', '.idea', '.vscode', '.cache']);
  const ignoreFileExtensions = new Set(['.zip', '.tar', '.gz', '.log']);

  /**
   * Recursively traverses local filesystem directories and writes entries into the ZIP bundle.
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
        const ext = path.extname(entry.name).toLowerCase();
        if (!ignoreFileExtensions.has(ext) && entry.name !== 'personal-library-project.zip') {
          const filePath = path.join(currentDir, entry.name);
          const zipPath = zipDir ? `${zipDir}` : '';
          try {
            const content = fs.readFileSync(filePath);
            zip.addFile(zipPath ? `${zipPath}/${entry.name}` : entry.name, content);
          } catch {
            // ignore unreadable files
          }
        }
      }
    }
  }

  addDirRecursive(projectRoot, '');
  return zip;
}

/**
 * Generates an in-memory Buffer of the project ZIP archive.
 * Completely avoids writing any files to disk or dirtying the repository root.
 *
 * @returns Buffer containing the compressed ZIP archive.
 */
export function generateProjectZipBuffer(): Buffer {
  const zip = buildProjectZipInstance();
  return zip.toBuffer();
}

/**
 * Packages the entire repository into a temporary ZIP archive in the OS temp directory.
 * Never creates archives in the repository root directory.
 *
 * @returns Absolute filesystem path to the generated zip archive in os.tmpdir().
 */
export function generateProjectZip(): string {
  const outputPath = path.resolve(os.tmpdir(), 'personal-library-project.zip');
  const zip = buildProjectZipInstance();
  zip.writeZip(outputPath);
  return outputPath;
}
