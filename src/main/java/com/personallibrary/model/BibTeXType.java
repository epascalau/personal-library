/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Standard classification types for bibliographic entries according to the BibTeX specification.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
public enum BibTeXType {
    /** An article from a journal or magazine. */
    ARTICLE("article"),
    /** A book with an explicit publisher. */
    BOOK("book"),
    /** An article in a conference proceedings. */
    INPROCEEDINGS("inproceedings"),
    /** A report published by an institution or university. */
    TECHREPORT("techreport"),
    /** A doctoral thesis or dissertation. */
    PHDTHESIS("phdthesis"),
    /** Fallback type when a document does not neatly fit any other classification. */
    MISC("misc");

    private final String value;

    /**
     * Initializes the enum constant with its standard lowercase BibTeX token.
     *
     * WHAT: Binds the serialized canonical string identifier to the enum constant.
     * WHY: Maintains direct compatibility with standard BibTeX `.bib` files and REST JSON serialization.
     *
     * @param value Canonical lowercase BibTeX type token.
     */
    BibTeXType(String value) {
        this.value = value;
    }

    /**
     * Returns the serialized string representation of the BibTeX type.
     *
     * WHAT: Returns the lowercase BibTeX entry type name (e.g. "article", "inproceedings").
     * WHY: Annotated with Jackson's `@JsonValue` to ensure clean lowercase string serialization
     * across JSON REST contracts and client stores.
     *
     * @return lowercase BibTeX type name.
     */
    @JsonValue
    public String getValue() {
        return value;
    }

    /**
     * Resolves a string value to its corresponding enum constant with fallback to MISC.
     *
     * WHAT: Case-insensitively compares the input string against known BibTeX constants, returning MISC if null or unrecognized.
     * WHY: Gracefully handles messy or non-standard BibTeX tokens encountered during PDF/DOCX heuristic metadata extraction
     * without throwing runtime exceptions.
     *
     * @param text input string value.
     * @return matching {@link BibTeXType} or {@link #MISC} if unmatched.
     */
    public static BibTeXType fromString(String text) {
        if (text == null) return MISC;
        for (BibTeXType b : BibTeXType.values()) {
            if (b.value.equalsIgnoreCase(text.trim())) {
                return b;
            }
        }
        return MISC;
    }
}

