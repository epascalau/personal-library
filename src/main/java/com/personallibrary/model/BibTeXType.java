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

    BibTeXType(String value) {
        this.value = value;
    }

    /**
     * Returns the serialized string representation of the BibTeX type.
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
