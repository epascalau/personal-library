package com.personallibrary.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * MongoDB document entity representing an ingested document in the enterprise library.
 * Persists bibliographic attributes, physical file location, AI-generated dual-model summaries,
 * and associated vector index chunks.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "documents")
public class DocumentEntity {

    /**
     * Unique identifier (GUID / UUID) for this document.
     */
    @Id
    private String guid;

    /**
     * Lineage tracking for versioning: links to the previous document GUID if overwritten.
     */
    @Indexed
    private String previousVersionGuid;

    /**
     * Incremental version number (1, 2, 3...).
     */
    private Integer versionNumber;

    /**
     * Original file name with extension.
     */
    @Indexed
    private String fileName;

    /**
     * File size in bytes.
     */
    private Long fileSize;

    /**
     * Human-readable formatted file size (e.g. "1.4 MB").
     */
    private String fileSizeFormatted;

    /**
     * File format extension (e.g. "pdf", "docx", "txt").
     */
    @Indexed
    private String format;

    /**
     * Physical file storage path on server disk or volume.
     */
    private String physicalFilePath;

    /**
     * Document initial creation/upload timestamp.
     */
    @Indexed
    private Instant uploadDate;

    /**
     * Latest modification or version overwrite timestamp.
     */
    private Instant editDate;

    /**
     * Structured BibTeX bibliographic metadata object.
     */
    private BibTeXMetadata bibtex;

    /**
     * Raw formatted RFC BibTeX citation string.
     */
    private String bibtexRaw;

    /**
     * Dual-model summaries map keyed by model engine ("llama", "mistral").
     */
    @Builder.Default
    private Map<String, SummaryRecord> summaries = new HashMap<>();

    /**
     * Brief excerpt of document content for list displays.
     */
    private String contentExcerpt;

    /**
     * Full extracted text content of the document.
     */
    private String fullContent;

    /**
     * Segmented text passage chunks indexed into the Qdrant vector database.
     */
    @Builder.Default
    private List<DocumentChunk> chunks = new ArrayList<>();

    /**
     * Converts a raw byte count into a readable binary string (B, KB, MB).
     *
     * @param bytes Number of bytes.
     * @return Formatted size string.
     */
    public static String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
    }
}
