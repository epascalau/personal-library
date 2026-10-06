/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.service;

import com.personallibrary.dto.DocumentResponse;
import com.personallibrary.dto.DocumentUploadRequest;
import com.personallibrary.dto.DownloadAsset;
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
     * WHAT: Orchestrates physical storage, text extraction, automated LLM BibTeX extraction,
     * semantic vector chunking in Qdrant, dual-model analytical/executive summarization, and MongoDB persistence.
     * WHY: Consolidates the complete multi-step ingestion lifecycle into an atomic, coherent service call
     * ensuring document assets, vector indexes, and summaries stay perfectly synchronized.
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
        Path storedPath = storageService.storeFile(file, guid, 1);
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
     * Advances the internal version sequence number and archives the prior state as an immutable snapshot.
     *
     * WHAT: Archives the current state into {@code versionHistory}, replaces physical asset on disk (in a
     * version-isolated subdirectory so the prior asset's bytes are never touched), extracts new text content,
     * updates BibTeX metadata, re-indexes semantic chunks in Qdrant, regenerates dual summaries, and increments
     * versionNumber.
     * WHY: Retaining the existing document GUID preserves deep links, bookmark URLs, and Object Page routes
     * while accurately reflecting updated revisions. Archiving a full snapshot before mutating the entity is
     * what makes {@link #getVersionHistory(String)}, {@link #getHistoricalDownloadAsset(String, int)}, and
     * {@link #rollbackToVersion(String, int)} possible.
     *
     * @param existingGuid   Persistent document GUID to update.
     * @param newFile        Optional replacement physical file.
     * @param updatedBibtex  Optional updated bibliographic metadata.
     * @return Updated {@link DocumentResponse}.
     * @throws IOException If file persistence or reading fails.
     */
    public DocumentResponse overwriteDocument(String existingGuid, MultipartFile newFile, BibTeXMetadata updatedBibtex) throws IOException {
        DocumentEntity existing = getEntityByGuid(existingGuid);
        int newVersionNumber = (existing.getVersionNumber() != null ? existing.getVersionNumber() : 1) + 1;

        // Archive the current active state as an immutable snapshot before mutating it.
        existing.getVersionHistory().add(0, buildSnapshot(existing, "Archived prior to overwrite to version " + newVersionNumber));

        String fileName = newFile != null ? newFile.getOriginalFilename() : existing.getFileName();
        String format = getFileExtension(fileName);
        long fileSize = newFile != null ? newFile.getSize() : existing.getFileSize();

        String textContent;
        String filePath;
        if (newFile != null) {
            Path storedPath = storageService.storeFile(newFile, existingGuid, newVersionNumber);
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
        existing.setVersionNumber(newVersionNumber);
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
     * Retrieves the archived historical version snapshot list for a document.
     *
     * WHAT: Returns the immutable list of {@link DocumentVersionSnapshot} archived prior to each overwrite
     * or rollback.
     * WHY: Powers the Object Page's version history panel, letting researchers inspect or restore prior
     * revisions without losing the currently active one.
     *
     * @param guid Unique document identifier.
     * @return List of historical version snapshots, newest first; empty if never overwritten.
     */
    public List<DocumentVersionSnapshot> getVersionHistory(String guid) {
        return getEntityByGuid(guid).getVersionHistory();
    }

    /**
     * Resolves the physical asset for the currently active version of a document.
     *
     * WHAT: Looks up the document's current physical file path and original file name.
     * WHY: Backs the primary "Download" action on the Object Page, decoupled from HTTP streaming concerns.
     *
     * @param guid Unique document identifier.
     * @return {@link DownloadAsset} pointing at the active version's physical file.
     */
    public DownloadAsset getDownloadAsset(String guid) {
        DocumentEntity entity = getEntityByGuid(guid);
        return new DownloadAsset(entity.getPhysicalFilePath(), entity.getFileName());
    }

    /**
     * Resolves the physical asset for a specific historical (or current) version of a document.
     *
     * WHAT: Returns the active version's asset directly if it matches the requested version number; otherwise
     * searches {@code versionHistory} for a matching archived snapshot's preserved physical file path.
     * WHY: Allows researchers to download any prior revision's exact original bytes, not just the latest one.
     *
     * @param guid          Unique document identifier.
     * @param targetVersion Version sequence number to resolve.
     * @return {@link DownloadAsset} pointing at the requested version's physical file.
     */
    public DownloadAsset getHistoricalDownloadAsset(String guid, int targetVersion) {
        DocumentEntity entity = getEntityByGuid(guid);
        int currentVersion = entity.getVersionNumber() != null ? entity.getVersionNumber() : 1;
        if (currentVersion == targetVersion) {
            return new DownloadAsset(entity.getPhysicalFilePath(), entity.getFileName());
        }

        DocumentVersionSnapshot snapshot = entity.getVersionHistory().stream()
                .filter(v -> Objects.equals(v.getVersionNumber(), targetVersion))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException(
                        "Historical version " + targetVersion + " not found for document " + guid));
        return new DownloadAsset(snapshot.getPhysicalFilePath(), snapshot.getFileName());
    }

    /**
     * Rolls back the document's active state to a previously archived historical version snapshot.
     *
     * WHAT: Restores metadata, BibTeX, summaries, text content, and physical file reference from the specified
     * snapshot, re-indexes Qdrant vector chunks for the restored content, archives the current (about-to-be
     * replaced) state as a new snapshot, and advances the version sequence counter.
     * WHY: Provides guaranteed non-destructive rollbacks: nothing is ever deleted, the restored state simply
     * becomes the new latest version while every prior revision (including the one just replaced) remains in
     * {@code versionHistory} for full audit integrity.
     *
     * @param guid          Document GUID to roll back.
     * @param targetVersion Historical version sequence number to restore.
     * @return Updated {@link DocumentResponse} reflecting the restored (new) active version.
     */
    public DocumentResponse rollbackToVersion(String guid, int targetVersion) {
        DocumentEntity existing = getEntityByGuid(guid);
        int currentVersion = existing.getVersionNumber() != null ? existing.getVersionNumber() : 1;
        if (currentVersion == targetVersion) {
            throw new IllegalArgumentException("Document is already at version " + targetVersion);
        }

        DocumentVersionSnapshot target = existing.getVersionHistory().stream()
                .filter(v -> Objects.equals(v.getVersionNumber(), targetVersion))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException(
                        "Historical version snapshot " + targetVersion + " not found for document " + guid));

        int newVersionNumber = currentVersion + 1;

        // Archive the current active state (the one being replaced) before restoring.
        existing.getVersionHistory().add(0, buildSnapshot(existing, "Archived prior to rollback to version " + targetVersion));

        // Re-index vector chunks for the restored content so semantic RAG search reflects the rolled-back text.
        List<DocumentChunk> chunks = vectorRagService.indexDocumentChunks(guid, target.getFullContent());

        existing.setFileName(target.getFileName());
        existing.setFileSize(target.getFileSize());
        existing.setFileSizeFormatted(target.getFileSizeFormatted());
        existing.setFormat(target.getFormat());
        existing.setPhysicalFilePath(target.getPhysicalFilePath());
        existing.setEditDate(Instant.now());
        existing.setVersionNumber(newVersionNumber);
        existing.setBibtex(target.getBibtex());
        existing.setBibtexRaw(target.getBibtexRaw());
        existing.setSummaries(target.getSummaries());
        existing.setContentExcerpt(target.getContentExcerpt());
        existing.setFullContent(target.getFullContent());
        existing.setChunks(chunks);

        DocumentEntity saved = documentRepository.save(existing);
        log.info("Document rolled back for GUID: {} to snapshot v{} (new active version v{})", guid, targetVersion, newVersionNumber);
        return DocumentResponse.fromEntity(saved);
    }

    /**
     * Builds an immutable snapshot capturing a document entity's current state, for archival into
     * {@code versionHistory} prior to an overwrite or rollback mutation.
     *
     * WHAT: Copies every user-facing and physical-asset field from the live entity into a
     * {@link DocumentVersionSnapshot}.
     * WHY: Centralizes snapshot construction so {@link #overwriteDocument} and {@link #rollbackToVersion}
     * cannot drift from each other on which fields get preserved.
     *
     * @param entity Live document entity to capture.
     * @param note   Human-readable audit note describing why this snapshot was archived.
     * @return Immutable {@link DocumentVersionSnapshot}.
     */
    private DocumentVersionSnapshot buildSnapshot(DocumentEntity entity, String note) {
        return DocumentVersionSnapshot.builder()
                .snapshotGuid("snapshot-" + entity.getGuid() + "-v" + entity.getVersionNumber() + "-" + System.currentTimeMillis())
                .versionNumber(entity.getVersionNumber())
                .fileName(entity.getFileName())
                .fileSize(entity.getFileSize())
                .fileSizeFormatted(entity.getFileSizeFormatted())
                .format(entity.getFormat())
                .physicalFilePath(entity.getPhysicalFilePath())
                .savedAt(entity.getEditDate() != null ? entity.getEditDate() : Instant.now())
                .bibtex(entity.getBibtex())
                .bibtexRaw(entity.getBibtexRaw())
                .summaries(entity.getSummaries())
                .contentExcerpt(entity.getContentExcerpt())
                .fullContent(entity.getFullContent())
                .chunksCount(entity.getChunks() != null ? entity.getChunks().size() : 0)
                .note(note)
                .build();
    }

    /**
     * Retrieves a single document by its GUID and transforms to response DTO.
     *
     * WHAT: Finds document entity by GUID in MongoDB and converts to DocumentResponse DTO.
     * WHY: Enforces read-only DTO boundaries for client layers, throwing standard NoSuchElementException if absent.
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
     * WHAT: Directly queries documentRepository for the DocumentEntity matching GUID.
     * WHY: Required by internal services (e.g. storage downloads, summarization triggers) that need internal fields like physicalFilePath.
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
     * WHAT: Deletes disk storage files via storageService, then deletes MongoDB entity record via documentRepository.
     * WHY: Prevents orphan disk files and stale metadata in the database when documents are deleted by users.
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
     * WHAT: Maps client sort keys to MongoDB field paths, assembles Pageable requests, calls dynamic query fragment,
     * and maps entities to PaginatedResponse of DocumentResponse DTOs.
     * WHY: Delivers high-performance server-side filtering, sorting, and pagination tailored specifically to
     * the SAP Fiori List Report grid specifications.
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

    /**
     * Extracts lowercase file extension from filename.
     *
     * WHAT: Splits filename by the last dot and returns the trailing string lowercased.
     * WHY: Normalizes file formats (e.g. "PDF", "pdf") for uniform categorization and UI icon rendering.
     *
     * @param fileName Original filename.
     * @return Lowercase format extension or "unknown".
     */
    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "unknown";
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    /**
     * Translates frontend column identifiers into MongoDB document property paths.
     *
     * WHAT: Maps UI column property keys ("title", "author", "edition") to nested MongoDB paths ("bibtex.title", etc.).
     * WHY: Shields frontend components from internal document database nesting conventions while enabling seamless sort delegation.
     *
     * @param clientField Frontend column name.
     * @return Internal MongoDB document property path.
     */
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

