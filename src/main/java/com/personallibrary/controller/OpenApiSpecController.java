/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Controller serving the hand-authored OpenAPI 3.0 contract (`openapi.yaml`),
 * mirroring the Node.js Integrated Gateway's `/api/v1/openapi.yaml` endpoint.
 *
 * <p>WHAT: Streams the contract file from the application working directory as `text/yaml`.
 * WHY: {@code SecurityConfig} already whitelists `/api/v1/openapi.yaml` as a public route, but no
 * handler implemented it, so the Java backend answered 404 on a path the frontend's OpenAPI viewer
 * and the generated Javadoc both link to. Note this is distinct from SpringDoc's generated
 * `/api-docs`: the contract is maintained contract-first and is the artefact the UI renders.</p>
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-08
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
@Tag(name = "OpenAPI", description = "Contract-first OpenAPI 3.0 specification document")
public class OpenApiSpecController {

    /**
     * Filesystem location of the contract, resolved against the working directory by default.
     * The Docker image copies `openapi.yaml` to `/app`, which is also the container working directory.
     */
    @Value("${app.openapi.spec-path:./openapi.yaml}")
    private String specPath;

    /**
     * Streams the OpenAPI 3.0 YAML contract.
     *
     * <p>WHAT: Resolves the configured path, and returns the file as `text/yaml` when present.
     * WHY: Backs the in-app OpenAPI viewer, Swagger UI / Redoc tooling, and external API consumers,
     * matching the Node gateway's response contract so either backend target behaves identically.</p>
     *
     * @return The YAML contract, or HTTP 404 when the file is not deployed alongside the application.
     */
    @GetMapping(value = "/openapi.yaml", produces = "text/yaml;charset=UTF-8")
    @Operation(summary = "OpenAPI 3.0 contract", description = "Returns the hand-authored openapi.yaml specification")
    public ResponseEntity<Resource> openApiSpec() {
        Path resolved = Paths.get(specPath).toAbsolutePath().normalize();

        if (!Files.isReadable(resolved)) {
            log.warn("OpenAPI specification not found or unreadable at {}", resolved);
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/yaml;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"openapi.yaml\"")
                .body(new FileSystemResource(resolved));
    }
}
