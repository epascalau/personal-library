/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Root Node.js / Express production server bootloader.
 *
 * WHAT: Imports and boots the integrated full-stack gateway server defined in `src/main/server/server.ts`.
 * WHY: Environment conventions in cloud runtimes look for `server.ts` or `server.js` at the workspace root.
 */

import './src/main/server/server.ts';

