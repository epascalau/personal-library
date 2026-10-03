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
}
