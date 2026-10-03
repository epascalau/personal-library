package com.personallibrary.repository;

import com.personallibrary.model.DocumentEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * MongoDB Data Repository for {@link DocumentEntity} persistence and querying.
 * Dynamic multi-field search for the SAP Horizon List Report floorplan is contributed by the
 * {@link DocumentRepositoryCustom} fragment.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Repository
public interface DocumentRepository extends MongoRepository<DocumentEntity, String>, DocumentRepositoryCustom {

    /**
     * Finds a document entity by its unique persistent GUID.
     *
     * @param guid Unique document identifier.
     * @return Optional containing the document if found.
     */
    Optional<DocumentEntity> findByGuid(String guid);

    /**
     * Finds all predecessor versions linked to a specified ancestor document GUID.
     *
     * @param previousVersionGuid Predecessor document GUID.
     * @return List of matching historical version records.
     */
    List<DocumentEntity> findByPreviousVersionGuid(String previousVersionGuid);

    /**
     * Executes a dynamic multi-predicate MongoDB query supporting individual or combined filters
     * across fileName, title, author, edition, file format, and document content.
     *
     * <p>Implemented by {@link DocumentRepositoryCustomImpl}: the predicate set varies per request,
     * which a static query string cannot express.</p>
     */
}
