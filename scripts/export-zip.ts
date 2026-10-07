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
export function buildProjectZipInstance(root: string = projectRoot): AdmZip {
  const zip = new AdmZip();

  const ignoreDirs = new Set([
    'node_modules', '.git', 'dist', 'target', '.idea', '.vscode', '.cache',
    // Never ship local state or trust material in a redistributable archive:
    // `certs/` holds the corporate CA used to pierce a TLS-intercepting proxy
    // (internal infrastructure detail), and `storage/` holds whatever documents
    // the operator happened to upload.
    'certs', 'storage',
  ]);
  const ignoreFileExtensions = new Set([
    '.zip', '.tar', '.gz', '.log',
    // Key and certificate material, wherever it lives.
    '.crt', '.pem', '.key', '.p12', '.jks', '.pfx',
  ]);

  /**
   * Secrets live in the operator's own dotenv, which is git-ignored precisely
   * because it is not shareable. `.env.example` and `config/settings.env` are
   * committed, non-secret templates and are deliberately kept.
   */
  const isSecretFile = (name: string): boolean =>
    (name === '.env' || name.startsWith('.env.')) && name !== '.env.example';

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
        if (!ignoreFileExtensions.has(ext)
          && !isSecretFile(entry.name)
          && entry.name !== 'personal-library-project.zip') {
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

  addDirRecursive(root, '');
  return zip;
}

/**
 * Generates an in-memory Buffer of the project ZIP archive.
 * Completely avoids writing any files to disk or dirtying the repository root.
 *
 * @returns Buffer containing the compressed ZIP archive.
 */
export function generateProjectZipBuffer(root: string = projectRoot): Buffer {
  const zip = buildProjectZipInstance(root);
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

/**
 * CLI entry point.
 *
 * WHAT: Writes the archive to the path given as the first argument, or to the
 * OS temp directory when none is supplied.
 * WHY: The module previously only exported functions and did nothing at all
 * when executed directly, so the documented `tsx scripts/export-zip.ts`
 * invocation silently produced no archive. It is also how the container image
 * bakes in a source snapshot at build time, since the runtime image contains
 * no project sources of its own.
 */
const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const target = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(os.tmpdir(), 'personal-library-project.zip');
  const sourceRoot = process.env.EXPORT_ZIP_ROOT
    ? path.resolve(process.env.EXPORT_ZIP_ROOT)
    : projectRoot;

  const zip = buildProjectZipInstance(sourceRoot);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  zip.writeZip(target);

  const { size } = fs.statSync(target);
  console.log(
    `Wrote ${target} (${zip.getEntries().length} entries, ${(size / 1048576).toFixed(1)} MB)`
  );
}
