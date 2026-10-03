package com.personallibrary.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Structured bibliographic metadata conforming to standard BibTeX specifications.
 * Supports academic citations, library catalogues, and research dissemination.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BibTeXMetadata {
    /** The classification category (e.g. {@link BibTeXType#ARTICLE}, {@link BibTeXType#BOOK}). */
    private BibTeXType entryType;
    /** The unique citation key (e.g. "Knuth1984"). */
    private String bibKey;
    /** Document or publication title. */
    private String title;
    /** Authors list, typically formatted as "LastName, FirstName and LastName2, FirstName2". */
    private String author;
    /** Four-digit publication year. */
    private String year;
    /** Publication month. */
    private String month;
    /** Journal or periodical name. */
    private String journal;
    /** Title of the book or conference proceedings. */
    private String booktitle;
    /** Journal or series volume. */
    private String volume;
    /** Issue number or technical report number. */
    private String number;
    /** Page range (e.g. "120--135"). */
    private String pages;
    /** Publishing house or press. */
    private String publisher;
    /** Publication edition (e.g. "2nd", "Revised"). */
    private String edition;
    /** Sponsoring institution for technical reports. */
    private String institution;
    /** Academic institution for dissertations and theses. */
    private String school;
    /** Digital Object Identifier (DOI). */
    private String doi;
    /** Canonical web link. */
    private String url;
    /** Summary abstract text. */
    private String abstractText;
    /** Comma-separated keyword list. */
    private String keywords;

    /**
     * Serializes this metadata object into an RFC-compliant raw BibTeX string format.
     *
     * @return Formatted multiline BibTeX citation string.
     */
    public String toRawBibTeX() {
        StringBuilder sb = new StringBuilder();
        sb.append("@").append(entryType != null ? entryType.name() : "misc")
          .append("{").append(bibKey != null ? bibKey : "docKey").append(",\n");
        if (title != null) sb.append("  title     = {").append(title).append("},\n");
        if (author != null) sb.append("  author    = {").append(author).append("},\n");
        if (year != null) sb.append("  year      = {").append(year).append("},\n");
        if (month != null) sb.append("  month     = {").append(month).append("},\n");
        if (journal != null) sb.append("  journal   = {").append(journal).append("},\n");
        if (booktitle != null) sb.append("  booktitle = {").append(booktitle).append("},\n");
        if (volume != null) sb.append("  volume    = {").append(volume).append("},\n");
        if (number != null) sb.append("  number    = {").append(number).append("},\n");
        if (pages != null) sb.append("  pages     = {").append(pages).append("},\n");
        if (publisher != null) sb.append("  publisher = {").append(publisher).append("},\n");
        if (edition != null) sb.append("  edition   = {").append(edition).append("},\n");
        if (institution != null) sb.append("  institution = {").append(institution).append("},\n");
        if (school != null) sb.append("  school    = {").append(school).append("},\n");
        if (doi != null) sb.append("  doi       = {").append(doi).append("},\n");
        if (url != null) sb.append("  url       = {").append(url).append("},\n");
        if (keywords != null) sb.append("  keywords  = {").append(keywords).append("},\n");
        sb.append("}");
        return sb.toString();
    }
}
