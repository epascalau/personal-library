/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
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
     * Factory method creating a quick ChatResponse without citations.
     *
     * WHAT: Constructs a ChatResponse with an empty list of citations.
     * WHY: Provides an expressive, clean instantiation pattern for direct model responses or error answers.
     *
     * @param answer Synthesized answer markdown.
     * @param modelUsed LLM model engine name.
     * @return ChatResponse instance.
     */
    public static ChatResponse of(String answer, String modelUsed) {
        return ChatResponse.builder()
                .answer(answer)
                .modelUsed(modelUsed)
                .citations(Collections.emptyList())
                .build();
    }

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

