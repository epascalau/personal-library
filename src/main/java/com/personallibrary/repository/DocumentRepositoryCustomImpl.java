package com.personallibrary.repository;

import com.personallibrary.model.DocumentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * {@link MongoTemplate} backed implementation of the dynamic document search.
 *
 * <p>Criteria are appended only for the filters the caller actually supplied, which keeps the
 * emitted MongoDB query minimal and index friendly. All user supplied terms are quoted via
 * {@link Pattern#quote(String)} so that regular expression metacharacters in search input are
 * treated as literals rather than altering the query semantics.</p>
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-02
 */
public class DocumentRepositoryCustomImpl implements DocumentRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    /**
     * Creates the fragment implementation.
     *
     * @param mongoTemplate Template used to execute the dynamically assembled query.
     */
    public DocumentRepositoryCustomImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Page<DocumentEntity> searchDocuments(
            String fileName,
            String title,
            String author,
            String edition,
            String format,
            String content,
            Pageable pageable
    ) {
        List<Criteria> filters = new ArrayList<>();

        addContains(filters, "fileName", fileName);
        addContains(filters, "bibtex.title", title);
        addContains(filters, "bibtex.author", author);
        addContains(filters, "bibtex.edition", edition);

        if (hasText(format)) {
            filters.add(Criteria.where("format").regex(exactIgnoreCase(format)));
        }

        if (hasText(content)) {
            Pattern term = containsIgnoreCase(content);
            filters.add(new Criteria().orOperator(
                    Criteria.where("fullContent").regex(term),
                    Criteria.where("chunks.text").regex(term),
                    Criteria.where("bibtex.abstractText").regex(term),
                    Criteria.where("bibtex.keywords").regex(term)
            ));
        }

        Query query = new Query();
        if (!filters.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(filters.toArray(new Criteria[0])));
        }

        // The count has to run against the unpaged query, otherwise totalCount would never
        // exceed the page size and the List Report pager would collapse to a single page.
        long total = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), DocumentEntity.class);
        List<DocumentEntity> documents = mongoTemplate.find(query.with(pageable), DocumentEntity.class);

        return PageableExecutionUtils.getPage(documents, pageable, () -> total);
    }

    /**
     * Appends a case-insensitive "contains" criterion when the supplied value carries text.
     *
     * @param filters Mutable criteria accumulator.
     * @param field   Target MongoDB document field path.
     * @param value   Optional user supplied search term.
     */
    private void addContains(List<Criteria> filters, String field, String value) {
        if (hasText(value)) {
            filters.add(Criteria.where(field).regex(containsIgnoreCase(value)));
        }
    }

    /**
     * Builds a case-insensitive substring pattern from a literal search term.
     *
     * @param value Raw user input.
     * @return Compiled pattern matching any occurrence of the literal term.
     */
    private Pattern containsIgnoreCase(String value) {
        return Pattern.compile(Pattern.quote(value.trim()), Pattern.CASE_INSENSITIVE);
    }

    /**
     * Builds a case-insensitive whole-value pattern from a literal term.
     *
     * @param value Raw user input.
     * @return Compiled anchored pattern matching the complete field value.
     */
    private Pattern exactIgnoreCase(String value) {
        return Pattern.compile("^" + Pattern.quote(value.trim()) + "$", Pattern.CASE_INSENSITIVE);
    }

    /**
     * Determines whether an optional filter value should be applied.
     *
     * @param value Candidate filter value.
     * @return {@code true} if the value is non-null and not blank.
     */
    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
