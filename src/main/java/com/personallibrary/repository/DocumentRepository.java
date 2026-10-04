/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.repository;

import com.personallibrary.model.DocumentEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * MongoDB Data Repository for {@link DocumentEntity} persistence and querying.
 * Dynamic multi-field search for the SAP Fiori List Report floorplan is contributed by the
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
     * WHAT: Queries MongoDB `documents` collection for a record where `guid` equals the provided argument.
     * WHY: Primary lookup mechanism for document detail retrieval, version overwriting, and deletion
     * using immutable UUIDs rather than internal MongoDB BSON ObjectIds.
     *
     * @param guid Unique document identifier.
     * @return Optional containing the document if found.
     */
    Optional<DocumentEntity> findByGuid(String guid);

    /**
     * Finds all predecessor versions linked to a specified ancestor document GUID.
     *
     * WHAT: Queries MongoDB `documents` collection matching `previousVersionGuid`.
     * WHY: Traverses document version lineage chains, allowing the UI and services to trace document revision history.
     *
     * @param previousVersionGuid Predecessor document GUID.
     * @return List of matching historical version records.
     */
    List<DocumentEntity> findByPreviousVersionGuid(String previousVersionGuid);
}

