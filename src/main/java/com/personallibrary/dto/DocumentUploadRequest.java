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
