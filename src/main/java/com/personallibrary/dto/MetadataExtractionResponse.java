/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.personallibrary.model.BibTeXMetadata;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object returned by the pre-upload AI metadata extraction endpoint.
 *
 * WHAT: Carries the inferred {@link BibTeXMetadata} fields flattened onto the response root, alongside the
 * plain text recovered from the document.
 * WHY: The upload dialog spreads the response directly onto its BibTeX form model, so the bibliographic
 * fields must appear at the top level rather than nested. Returning the extracted text as well lets the
 * dialog display a content preview for binary formats such as PDF, whose text the browser cannot read.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-08
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MetadataExtractionResponse {

    /** Inferred bibliographic fields, serialized flat onto the response root. */
    @JsonUnwrapped
    private BibTeXMetadata bibtex;

    /** Plain text recovered from the document, empty when no text layer is present. */
    private String extractedText;
}
