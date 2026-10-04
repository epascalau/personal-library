/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.dto;

import com.personallibrary.model.BibTeXMetadata;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object containing document upload metadata and optional content payload
 * when submitting documents via JSON endpoints or API clients.
 *
 * WHAT: Encapsulates incoming document attributes (file name, format, byte size, raw text, and optional BibTeX metadata).
 * WHY: Decouples multipart form parameters and JSON body payloads from persistence entities, allowing validation
 * and pre-processing before allocating file storage or executing entity persistence.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadRequest {
    /** Target file name. */
    private String fileName;
    /** File format classification. */
    private String fileFormat;
    /** File size in bytes. */
    private Long fileSize;
    /** Raw text content of the document. */
    private String fileContent;
    /** Optional pre-filled BibTeX metadata. */
    private BibTeXMetadata bibtex;
}

