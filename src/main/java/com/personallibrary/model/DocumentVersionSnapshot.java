package com.personallibrary.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * Preserved immutable snapshot of a prior document version for auditing and rollback.
 *
 * WHAT: Stores previous revision metadata, text content, summaries, and file attributes.
 * WHY: Enables historical asset downloading and non-destructive rollbacks while maintaining full lineage.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVersionSnapshot {

    /**
     * Unique identifier for this version snapshot.
     */
    private String snapshotGuid;

    /**
     * Historical version sequence number (e.g. 1, 2).
     */
    private Integer versionNumber;

    /**
     * Historical file name.
     */
    private String fileName;

    /**
     * Historical file size in bytes.
     */
    private Long fileSize;

    /**
     * Formatted file size string.
     */
    private String fileSizeFormatted;

    /**
     * Historical format extension.
     */
    private String format;

    /**
     * Physical file storage path on server disk where this historical version's asset is preserved.
     */
    private String physicalFilePath;

    /**
     * Timestamp when this snapshot was archived.
     */
    private Instant savedAt;

    /**
     * Preserved BibTeX metadata.
     */
    private BibTeXMetadata bibtex;

    /**
     * Raw BibTeX string entry.
     */
    private String bibtexRaw;

    /**
     * Dual-model AI summaries preserved at this version.
     */
    private Map<String, SummaryRecord> summaries;

    /**
     * Short excerpt snippet.
     */
    private String contentExcerpt;

    /**
     * Complete extracted full text.
     */
    private String fullContent;

    /**
     * Segmented chunks count at time of snapshot.
     */
    private Integer chunksCount;

    /**
     * Contextual audit or rollback note.
     */
    private String note;
}
