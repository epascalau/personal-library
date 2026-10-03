package com.personallibrary.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.personallibrary.dto.*;
import com.personallibrary.model.BibTeXMetadata;
import com.personallibrary.model.DocumentEntity;
import com.personallibrary.model.SummaryRecord;
import com.personallibrary.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

/**
 * REST Controller exposing document management endpoints for the SAP Horizon floorplans:
 * List Report querying with multi-attribute filtering, Object Page details,
 * file uploads with automated BibTeX extraction and dual summarization,
 * in-place version overwriting, and RAG conversational search.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Document management, BibTeX extraction, dual summaries, and RAG chat")
public class DocumentController {

    private final DocumentService documentService;
    private final BibTeXExtractionService extractionService;
    private final AiSummarizationService summarizationService;
    private final VectorRagService vectorRagService;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    /**
     * List Report Floorplan query:
     * Supports single or combined filters: file name, document name, author, edition, format, content.
     *
     * @param fileName  Filter for physical file name.
     * @param title     Filter for bibliographic title.
     * @param author    Filter for author name.
     * @param edition   Filter for edition.
     * @param format    Filter for file format.
     * @param content   Full-text search query.
     * @param page      Page number (1-based).
     * @param pageSize  Page size.
     * @param sortBy    Sort field.
     * @param sortOrder Sort direction ("asc" or "desc").
     * @return Paginated list of document responses.
     */
    @GetMapping
    @Operation(summary = "Retrieve and filter paginated document list (List Report Floorplan)")
    public ResponseEntity<PaginatedResponse<DocumentResponse>> getDocuments(
            @RequestParam(required = false) String fileName,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String edition,
            @RequestParam(required = false, defaultValue = "all") String format,
            @RequestParam(required = false) String content,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "uploadDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder
    ) {
        String cleanFormat = "all".equalsIgnoreCase(format) ? null : format;
        PaginatedResponse<DocumentResponse> response = documentService.searchDocuments(
                fileName, title, author, edition, cleanFormat, content, page, pageSize, sortBy, sortOrder
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Uploads a single file and triggers automated pipeline:
     * file persistence, BibTeX extraction, Qdrant vector indexing, and dual model summaries.
     *
     * @param file       Uploaded multipart file.
     * @param bibtexJson Optional JSON-encoded BibTeX metadata.
     * @return {@link DocumentResponse} representing the new document.
     * @throws IOException If file parsing fails.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload document (single file only) and trigger automated pipeline")
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "bibtex", required = false) String bibtexJson
    ) throws IOException {
        BibTeXMetadata bibtex = null;
        if (bibtexJson != null && !bibtexJson.isBlank()) {
            bibtex = objectMapper.readValue(bibtexJson, BibTeXMetadata.class);
        }

        DocumentResponse response = documentService.uploadDocument(file, bibtex);
        return ResponseEntity.status(201).body(response);
    }

    /**
     * AI extraction preview helper endpoint.
     *
     * @param payload Map containing fileName and contentSample.
     * @return Extracted {@link BibTeXMetadata}.
     */
    @PostMapping("/extract-metadata")
    @Operation(summary = "Auto-extract BibTeX metadata suggestions using Spring AI")
    public ResponseEntity<BibTeXMetadata> extractMetadata(@RequestBody Map<String, String> payload) {
        String fileName = payload.getOrDefault("fileName", "document.txt");
        String sampleContent = payload.getOrDefault("contentSample", "");
        BibTeXMetadata extracted = extractionService.extractMetadata(fileName, sampleContent);
        return ResponseEntity.ok(extracted);
    }

    /**
     * Object Page Floorplan: Retrieve document details.
     *
     * @param guid Unique document identifier.
     * @return {@link DocumentResponse} DTO.
     */
    @GetMapping("/{guid}")
    @Operation(summary = "Retrieve document details for Object Page Floorplan")
    public ResponseEntity<DocumentResponse> getDocument(@PathVariable String guid) {
        return ResponseEntity.ok(documentService.getDocumentByGuid(guid));
    }

    /**
     * Overwrites active document content and metadata in-place while keeping its existing GUID.
     *
     * @param guid       Document GUID to overwrite.
     * @param file       Optional replacement file asset.
     * @param bibtexJson Optional replacement BibTeX metadata JSON string.
     * @return Updated {@link DocumentResponse}.
     * @throws IOException If file reading or parsing fails.
     */
    @PutMapping(value = "/{guid}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload replacement version (overwrites active document in-place, preserves GUID)")
    public ResponseEntity<DocumentResponse> overwriteVersion(
            @PathVariable String guid,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "bibtex", required = false) String bibtexJson
    ) throws IOException {
        BibTeXMetadata bibtex = null;
        if (bibtexJson != null && !bibtexJson.isBlank()) {
            bibtex = objectMapper.readValue(bibtexJson, BibTeXMetadata.class);
        }
        DocumentResponse response = documentService.overwriteDocument(guid, file, bibtex);
        return ResponseEntity.ok(response);
    }

    /**
     * Permanently purges a document, its physical asset, and vector embeddings.
     *
     * @param guid Unique document identifier.
     * @return Status map confirming purge.
     */
    @DeleteMapping("/{guid}")
    @Operation(summary = "Delete document record, file asset, and Qdrant vector embeddings")
    public ResponseEntity<Map<String, Object>> deleteDocument(@PathVariable String guid) {
        documentService.deleteDocument(guid);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document " + guid + " purged from MongoDB, local drive, and Qdrant."
        ));
    }

    /**
     * Triggers summary regeneration for a specific model (Llama 3.3 or Mistral Large).
     *
     * @param guid    Document GUID.
     * @param request {@link SummarizeRequest} indicating target model engine.
     * @return Newly computed {@link SummaryRecord}.
     */
    @PostMapping("/{guid}/summarize")
    @Operation(summary = "Trigger summary regeneration for a specific model (llama or mistral)")
    public ResponseEntity<SummaryRecord> regenerateSummary(
            @PathVariable String guid,
            @Valid @RequestBody SummarizeRequest request
    ) {
        DocumentEntity doc = documentService.getEntityByGuid(guid);
        SummaryRecord newSummary = summarizationService.generateSummaryForModel(
                request.getModel(),
                doc.getBibtex().getTitle(),
                doc.getFullContent(),
                doc.getBibtex()
        );

        doc.getSummaries().put(request.getModel().toLowerCase(), newSummary);
        doc.setEditDate(java.time.Instant.now());
        documentService.getDocumentByGuid(guid); // verify exists

        return ResponseEntity.ok(newSummary);
    }

    /**
     * Interactive RAG conversational chat scoped to the active document.
     *
     * @param guid    Document GUID.
     * @param request {@link ChatRequest} with question and conversation history.
     * @return {@link ChatResponse} with answer and grounded citations.
     */
    @PostMapping("/{guid}/chat")
    @Operation(summary = "Conversational chat with document assistant via Qdrant RAG and Llama 3.3")
    public ResponseEntity<ChatResponse> chatWithDocument(
            @PathVariable String guid,
            @Valid @RequestBody ChatRequest request
    ) {
        DocumentEntity doc = documentService.getEntityByGuid(guid);
        ChatResponse response = vectorRagService.chatWithDocument(doc, request);
        return ResponseEntity.ok(response);
    }
}
