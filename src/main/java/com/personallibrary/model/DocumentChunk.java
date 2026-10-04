/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
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

    /**
     * Factory method creating a new indexed DocumentChunk instance.
     *
     * WHAT: Constructs a DocumentChunk with given id, index, and text payload.
     * WHY: Provides an expressive constructor pattern when partitioning raw document text into vector-ready segments.
     *
     * @param id Unique point identifier.
     * @param chunkIndex 0-based sequence number within document.
     * @param text Passage text.
     * @return Initialized DocumentChunk.
     */
    public static DocumentChunk of(String id, int chunkIndex, String text) {
        return new DocumentChunk(id, chunkIndex, text);
    }
}

