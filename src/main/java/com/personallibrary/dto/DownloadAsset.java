/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.dto;

/**
 * Lightweight descriptor pointing to a physical file asset ready to be streamed to a client,
 * covering both the currently active document version and preserved historical snapshots.
 *
 * WHAT: Pairs a disk path with the original file name the client should see in its
 * Content-Disposition header.
 * WHY: Keeps the download resolution logic in {@code DocumentService} decoupled from the
 * HTTP streaming mechanics in {@code DocumentController}.
 *
 * @param physicalFilePath Absolute or relative path to the file on disk.
 * @param fileName         Original file name to present to the downloading client.
 */
public record DownloadAsset(String physicalFilePath, String fileName) {
}
