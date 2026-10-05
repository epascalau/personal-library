/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.dto;

import com.personallibrary.model.BibTeXMetadata;
import com.personallibrary.model.DocumentChunk;
import com.personallibrary.model.DocumentEntity;
import com.personallibrary.model.DocumentVersionSnapshot;
import com.personallibrary.model.SummaryRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object representing an enterprise document response for API clients,
 * the SAP Fiori List Report table, and the Object Page details view.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {
    /** Unique document identifier (UUID). */
    private String guid;
    /** Historical parent version GUID if versioned. */
    private String previousVersionGuid;
    /** Sequential version number (e.g. 1, 2). */
    private Integer versionNumber;
    /** Physical file name with extension. */
    private String fileName;
    /** File size in bytes. */
    private Long fileSize;
    /** Readable file size string (e.g. "2.4 MB"). */
    private String fileSizeFormatted;
    /** File format classification. */
    private String format;
    /** Ingestion timestamp. */
    private Instant uploadDate;
    /** Last edit or overwrite timestamp. */
    private Instant editDate;
    /** Structured BibTeX metadata. */
    private BibTeXMetadata bibtex;
    /** Raw formatted BibTeX citation string. */
    private String bibtexRaw;
    /** AI summaries mapped by model engine ("llama", "mistral"). */
    private Map<String, SummaryRecord> summaries;
    /** Short initial excerpt for list view rendering. */
    private String contentExcerpt;
    /** Indexed text chunks. */
    private List<DocumentChunk> chunks;
    /** Historical version snapshots preserved prior to in-place overwrites or rollbacks. */
    private List<DocumentVersionSnapshot> versionHistory;

    /**
     * Converts a database {@link DocumentEntity} domain model to this external API response DTO.
     *
     * WHAT: Maps all persisted entity attributes (GUID, versioning chain, physical file metrics, BibTeX metadata,
     * dual summaries, content excerpt, and text chunks) into an immutable, decoupled response representation.
     * WHY: Prevents internal persistence annotations and sensitive database storage internals (such as raw filesystem
     * paths) from leaking into external REST contracts, preserving strict separation of concerns.
     *
     * @param entity Persisted document entity.
     * @return Transformed {@link DocumentResponse} DTO.
     */
    public static DocumentResponse fromEntity(DocumentEntity entity) {
        return DocumentResponse.builder()
                .guid(entity.getGuid())
                .previousVersionGuid(entity.getPreviousVersionGuid())
                .versionNumber(entity.getVersionNumber())
                .fileName(entity.getFileName())
                .fileSize(entity.getFileSize())
                .fileSizeFormatted(entity.getFileSizeFormatted())
                .format(entity.getFormat())
                .uploadDate(entity.getUploadDate())
                .editDate(entity.getEditDate())
                .bibtex(entity.getBibtex())
                .bibtexRaw(entity.getBibtexRaw())
                .summaries(entity.getSummaries())
                .contentExcerpt(entity.getContentExcerpt())
                .chunks(entity.getChunks())
                .versionHistory(entity.getVersionHistory())
                .build();
    }
}
