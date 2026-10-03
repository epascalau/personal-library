package com.personallibrary.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a segmented passage chunk from a document stored in the Qdrant vector database
 * for semantic similarity search and Retrieval-Augmented Generation (RAG).
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunk {
    /** Unique vector point identifier or chunk UUID. */
    private String id;
    /** Zero-based positional index of the chunk within the parent document. */
    private int chunkIndex;
    /** Text content of the passage chunk. */
    private String text;
}
