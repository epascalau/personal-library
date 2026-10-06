/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object for the top-level `/chat` convenience RAG endpoint, which identifies the
 * target document inline in the request body rather than via a path variable.
 *
 * WHAT: Carries the same question/chatHistory payload as {@link ChatRequest}, plus either
 * `documentGuid` or `guid` (both accepted for client flexibility) identifying which document to
 * scope the conversational search to.
 * WHY: Some API consumers prefer a single flat chat endpoint over a nested per-document resource
 * path; this DTO lets `/chat` accept both common field name conventions without ambiguity.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-06
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatConvenienceRequest {

    /**
     * Target document GUID (primary field name per the OpenAPI contract).
     */
    private String documentGuid;

    /**
     * Alternate target document GUID field name, accepted for client flexibility.
     */
    private String guid;

    /**
     * User's natural language question regarding the document.
     */
    @NotBlank(message = "Question cannot be blank")
    private String question;

    /**
     * Optional conversation turns for contextual multi-turn dialogue.
     */
    private List<ChatRequest.ChatMessageDto> chatHistory;

    /**
     * Resolves the effective target document GUID, preferring {@code documentGuid} over {@code guid}.
     *
     * @return The non-null document GUID the client supplied, or {@code null} if neither was set.
     */
    public String resolveGuid() {
        return documentGuid != null ? documentGuid : guid;
    }
}
