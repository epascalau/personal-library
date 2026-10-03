package com.personallibrary.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object containing the synthesized RAG model answer
 * along with ground-truth citations retrieved from the Qdrant vector database.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    /** Synthesized answer markdown. */
    private String answer;
    /** Model engine identifier that synthesized the response. */
    private String modelUsed;
    /** Cited semantic chunks verifying the factual claims. */
    private List<CitationDto> citations;

    /**
     * Citation metadata item with similarity score and verbatim excerpt snippet.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CitationDto {
        /** Positional index of the referenced document chunk. */
        private int chunkIndex;
        /** Cosine vector similarity score. */
        private double score;
        /** Verbatim passage excerpt. */
        private String snippet;
    }
}
