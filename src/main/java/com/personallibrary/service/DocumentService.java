package com.personallibrary.service;

import com.personallibrary.dto.DocumentResponse;
import com.personallibrary.dto.DocumentUploadRequest;
import com.personallibrary.dto.PaginatedResponse;
import com.personallibrary.model.*;
import com.personallibrary.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

/**
 * Core business service managing document lifecycle operations:
 * Ingestion, automated metadata extraction, physical asset persistence,
 * Qdrant vector indexing, in-place version overwriting, and multi-field search.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final BibTeXExtractionService extractionService;
    private final AiSummarizationService summarizationService;
    private final VectorRagService vectorRagService;

    /**
     * Executes the initial document upload workflow:
     * - Generates unique GUID.
     * - Saves physical asset.
     * - Auto-extracts BibTeX if not fully provided.
     * - Chunks and indexes vector embeddings into Qdrant.
     * - Generates dual-model summaries (Llama & Mistral).
     *
     * @param file       Uploaded multipart file.
     * @param userBibtex Optional user-provided BibTeX attributes.
     * @return {@link DocumentResponse} DTO for the new document.
     * @throws IOException If file persistence or parsing fails.
     */
    public DocumentResponse uploadDocument(MultipartFile file, BibTeXMetadata userBibtex) throws IOException {
        String guid = UUID.randomUUID().toString();
        String originalFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.txt";
        String format = getFileExtension(originalFileName);

        // 1. Store physical asset
        Path storedPath = storageService.storeFile(file, guid);
        String textContent = storageService.extractTextContent(storedPath);

        // 2. BibTeX metadata
        BibTeXMetadata finalBibtex = userBibtex != null && userBibtex.getTitle() != null
                ? userBibtex
                : extractionService.extractMetadata(originalFileName, textContent);
        String bibtexRaw = finalBibtex.toRawBibTeX();

        // 3. Index to Qdrant vector store
        List<DocumentChunk> chunks = vectorRagService.indexDocumentChunks(guid, textContent);

        // 4. Compute dual-model summaries automatically
        Map<String, SummaryRecord> summaries = summarizationService.generateDualSummaries(
                finalBibtex.getTitle(), textContent, finalBibtex);

        DocumentEntity entity = DocumentEntity.builder()
                .guid(guid)
                .previousVersionGuid(null)
                .versionNumber(1)
                .fileName(originalFileName)
                .fileSize(file.getSize())
                .fileSizeFormatted(DocumentEntity.formatBytes(file.getSize()))
                .format(format)
                .physicalFilePath(storedPath.toString())
                .uploadDate(Instant.now())
                .editDate(Instant.now())
                .bibtex(finalBibtex)
                .bibtexRaw(bibtexRaw)
                .summaries(summaries)
                .contentExcerpt(textContent.substring(0, Math.min(textContent.length(), 400)))
                .fullContent(textContent)
                .chunks(chunks)
                .build();

        DocumentEntity saved = documentRepository.save(entity);
        log.info("Ingested and saved document with GUID: {}", guid);
        return DocumentResponse.fromEntity(saved);
    }

    /**
     * Overwrites an existing document's file content and metadata in-place while retaining its persistent GUID.
     * Advances the internal version sequence number.
     *
     * @param existingGuid   Persistent document GUID to update.
     * @param newFile        Optional replacement physical file.
     * @param updatedBibtex  Optional updated bibliographic metadata.
     * @return Updated {@link DocumentResponse}.
     * @throws IOException If file persistence or reading fails.
     */
    public DocumentResponse overwriteDocument(String existingGuid, MultipartFile newFile, BibTeXMetadata updatedBibtex) throws IOException {
        DocumentEntity existing = getEntityByGuid(existingGuid);

        String fileName = newFile != null ? newFile.getOriginalFilename() : existing.getFileName();
        String format = getFileExtension(fileName);
        long fileSize = newFile != null ? newFile.getSize() : existing.getFileSize();

        String textContent;
        String filePath;
        if (newFile != null) {
            Path storedPath = storageService.storeFile(newFile, existingGuid);
            filePath = storedPath.toString();
            textContent = storageService.extractTextContent(storedPath);
        } else {
            filePath = existing.getPhysicalFilePath();
            textContent = existing.getFullContent();
        }

        BibTeXMetadata finalBibtex = updatedBibtex != null ? updatedBibtex : existing.getBibtex();
        List<DocumentChunk> chunks = vectorRagService.indexDocumentChunks(existingGuid, textContent);
        Map<String, SummaryRecord> summaries = summarizationService.generateDualSummaries(
                finalBibtex.getTitle(), textContent, finalBibtex);

        existing.setFileName(fileName);
        existing.setFileSize(fileSize);
        existing.setFileSizeFormatted(DocumentEntity.formatBytes(fileSize));
        existing.setFormat(format);
        existing.setPhysicalFilePath(filePath);
        existing.setEditDate(Instant.now());
        existing.setVersionNumber((existing.getVersionNumber() != null ? existing.getVersionNumber() : 1) + 1);
        existing.setBibtex(finalBibtex);
        existing.setBibtexRaw(finalBibtex.toRawBibTeX());
        existing.setSummaries(summaries);
        existing.setContentExcerpt(textContent.substring(0, Math.min(textContent.length(), 400)));
        existing.setFullContent(textContent);
        existing.setChunks(chunks);

        DocumentEntity saved = documentRepository.save(existing);
        log.info("Document content overwritten in-place for GUID: {} (v{})", existingGuid, saved.getVersionNumber());
        return DocumentResponse.fromEntity(saved);
    }

    /**
     * Retrieves a single document by its GUID and transforms to response DTO.
     *
     * @param guid Unique document identifier.
     * @return {@link DocumentResponse} DTO.
     */
    public DocumentResponse getDocumentByGuid(String guid) {
        DocumentEntity entity = documentRepository.findByGuid(guid)
                .orElseThrow(() -> new NoSuchElementException("Document with GUID " + guid + " not found"));
        return DocumentResponse.fromEntity(entity);
    }

    /**
     * Retrieves the raw persistent entity by its GUID.
     *
     * @param guid Unique document identifier.
     * @return {@link DocumentEntity} database entity.
     */
    public DocumentEntity getEntityByGuid(String guid) {
        return documentRepository.findByGuid(guid)
                .orElseThrow(() -> new NoSuchElementException("Document with GUID " + guid + " not found"));
    }

    /**
     * Permanently purges a document, its physical disk assets, and vector embeddings.
     *
     * @param guid Document GUID to delete.
     */
    public void deleteDocument(String guid) {
        DocumentEntity entity = getEntityByGuid(guid);
        storageService.deletePhysicalAsset(guid);
        documentRepository.delete(entity);
        log.info("Document and physical assets purged for GUID: {}", guid);
    }

    /**
     * Executes dynamic multi-attribute queries supporting single or combined filters
     * across fileName, title, author, edition, format, and content for the List Report floorplan.
     *
     * @param fileName  Filter substring for file name.
     * @param title     Filter substring for bibliographic title.
     * @param author    Filter substring for author name.
     * @param edition   Filter substring for edition.
     * @param format    Target file format extension.
     * @param content   Full-text search query.
     * @param page      1-based page number.
     * @param pageSize  Page slice limit.
     * @param sortBy    Field to sort on.
     * @param sortOrder Direction ("asc" or "desc").
     * @return {@link PaginatedResponse} containing matching documents.
     */
    public PaginatedResponse<DocumentResponse> searchDocuments(
            String fileName,
            String title,
            String author,
            String edition,
            String format,
            String content,
            int page,
            int pageSize,
            String sortBy,
            String sortOrder
    ) {
        Sort.Direction direction = "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String mappedSort = mapSortField(sortBy);
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), pageSize, Sort.by(direction, mappedSort));

        Page<DocumentEntity> entityPage = documentRepository.searchDocuments(fileName, title, author, edition, format, content, pageable);

        List<DocumentResponse> dtos = entityPage.getContent().stream()
                .map(DocumentResponse::fromEntity)
                .toList();

        return PaginatedResponse.<DocumentResponse>builder()
                .items(dtos)
                .totalCount(entityPage.getTotalElements())
                .page(page)
                .pageSize(pageSize)
                .totalPages(entityPage.getTotalPages())
                .build();
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "unknown";
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    private String mapSortField(String clientField) {
        if (clientField == null) return "uploadDate";
        return switch (clientField) {
            case "fileName" -> "fileName";
            case "fileSize" -> "fileSize";
            case "format" -> "format";
            case "title" -> "bibtex.title";
            case "author" -> "bibtex.author";
            case "edition" -> "bibtex.edition";
            case "editDate" -> "editDate";
            default -> "uploadDate";
        };
    }
}
