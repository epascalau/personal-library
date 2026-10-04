/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Generic container for paginated query results returning items,
 * total match count, and navigation metadata.
 *
 * @param <T> Content item element type.
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginatedResponse<T> {
    /** Current page content items. */
    private List<T> items;
    /** Total number of items matching the query criteria across all pages. */
    private long totalCount;
    /** 1-based page index. */
    private int page;
    /** Page capacity size limit. */
    private int pageSize;
    /** Calculated total page count. */
    private int totalPages;

    /**
     * Factory method computing total pages and constructing a typed PaginatedResponse.
     *
     * WHAT: Calculates totalPages as `ceil(totalCount / pageSize)` and builds the PaginatedResponse instance.
     * WHY: Centralizes pagination math in one location, avoiding repetitive calculation across services and controllers.
     *
     * @param items Current page records list.
     * @param totalCount Overall matching records across the entire dataset.
     * @param page Current 1-based page index.
     * @param pageSize Maximum records per page.
     * @param <T> Record item type.
     * @return Complete PaginatedResponse container.
     */
    public static <T> PaginatedResponse<T> of(List<T> items, long totalCount, int page, int pageSize) {
        int calculatedPages = pageSize > 0 ? (int) Math.ceil((double) totalCount / pageSize) : 1;
        return PaginatedResponse.<T>builder()
                .items(items)
                .totalCount(totalCount)
                .page(page)
                .pageSize(pageSize)
                .totalPages(calculatedPages)
                .build();
    }
}

