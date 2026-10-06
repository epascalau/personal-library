/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Centralized REST exception translation, mapping internal service-layer exceptions to the
 * HTTP status codes documented in the project's OpenAPI 3.0 contract (openapi.yaml).
 *
 * WHAT: Converts {@link NoSuchElementException} (document, version, or snapshot not found) into
 * HTTP 404, and {@link IllegalArgumentException} (invalid client-supplied state, e.g. rolling back
 * to the already-active version) into HTTP 400, each with a small JSON error body.
 * WHY: Without this advice, Spring's default error handling surfaces these as HTTP 500 Internal
 * Server Error, which both leaks stack traces and contradicts the documented `404`/`400` response
 * codes for endpoints like `GET /documents/{guid}`, `GET /documents/{guid}/versions/{version}/download`,
 * and `POST /documents/{guid}/rollback/{version}`.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-06
 */
@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex) {
        log.debug("Resolved to 404: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        log.debug("Resolved to 400: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }
}
