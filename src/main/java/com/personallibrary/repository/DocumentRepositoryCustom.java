package com.personallibrary.repository;

import com.personallibrary.model.DocumentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Custom repository fragment providing the dynamic multi-predicate document search
 * backing the SAP Horizon List Report floorplan.
 *
 * <p>The filter combination is genuinely dynamic: every criterion is optional and any
 * subset may be supplied. Such a query cannot be expressed as a static
 * {@link org.springframework.data.mongodb.repository.Query} string, so it is assembled
 * programmatically against {@link org.springframework.data.mongodb.core.MongoTemplate}.</p>
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-02
 */
public interface DocumentRepositoryCustom {

    /**
     * Executes a dynamic multi-predicate MongoDB query supporting any combination of
     * fileName, title, author, edition, file format, and full-text content filters.
     * Omitted ({@code null} or blank) criteria are not applied.
     *
     * @param fileName Optional file name substring (case-insensitive).
     * @param title    Optional bibliographic title substring (case-insensitive).
     * @param author   Optional author substring (case-insensitive).
     * @param edition  Optional edition substring (case-insensitive).
     * @param format   Optional file format extension, matched exactly (case-insensitive), e.g. "pdf".
     * @param content  Optional full-text term matched against the document body, its indexed
     *                 chunks, the abstract, and the keyword list.
     * @param pageable Pagination and sorting specification.
     * @return Paginated result slice of matching {@link DocumentEntity} objects.
     */
    Page<DocumentEntity> searchDocuments(
            String fileName,
            String title,
            String author,
            String edition,
            String format,
            String content,
            Pageable pageable
    );
}
