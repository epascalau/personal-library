/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.controller;

import com.personallibrary.dto.ChatConvenienceRequest;
import com.personallibrary.dto.ChatRequest;
import com.personallibrary.dto.ChatResponse;
import com.personallibrary.model.DocumentEntity;
import com.personallibrary.service.DocumentService;
import com.personallibrary.service.VectorRagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Top-level convenience REST controller exposing `/chat` as a flat alternative to the
 * document-scoped `/documents/{guid}/chat` RAG endpoint.
 *
 * WHAT: Accepts a document identifier inline in the request body (as `documentGuid` or `guid`)
 * instead of as a path variable, then delegates to the same {@link VectorRagService} RAG pipeline.
 * WHY: Documented in the project's OpenAPI 3.0 contract (openapi.yaml) as a convenience endpoint
 * for API consumers that prefer a single flat chat resource over nested per-document paths.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-06
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "AI Services", description = "Convenience RAG chat endpoint")
public class ChatController {

    private final DocumentService documentService;
    private final VectorRagService vectorRagService;

    /**
     * Convenience RAG chat endpoint identifying the target document inline in the request body.
     *
     * WHAT: Resolves the target document via `documentGuid`/`guid`, then queries Qdrant for semantic
     * citations and generates a grounded answer via Llama 3.3, identically to
     * {@code DocumentController.chatWithDocument}.
     * WHY: Mirrors the per-document chat endpoint's RAG grounding and citation behavior for clients
     * that prefer not to nest the document identifier in the URL path.
     *
     * @param request {@link ChatConvenienceRequest} carrying the target document GUID, question, and history.
     * @return {@link ChatResponse} with answer and grounded citations.
     */
    @PostMapping("/chat")
    @Operation(summary = "Document RAG assistant query (convenience endpoint; accepts documentGuid or guid in body)")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatConvenienceRequest request) {
        String guid = request.resolveGuid();
        if (guid == null || guid.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        DocumentEntity doc = documentService.getEntityByGuid(guid);
        ChatRequest chatRequest = ChatRequest.builder()
                .question(request.getQuestion())
                .chatHistory(request.getChatHistory())
                .build();

        return ResponseEntity.ok(vectorRagService.chatWithDocument(doc, chatRequest));
    }
}
