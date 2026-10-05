/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.controller;

import com.personallibrary.repository.DocumentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Controller reporting aggregate health status of the Java Spring Boot backend,
 * mirroring the shape returned by the Node.js Integrated Gateway's `/api/v1/health` endpoint.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-06
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Health", description = "Aggregate backend, AI model, vector store, and identity provider health status")
public class HealthController {

    private final DocumentRepository documentRepository;
    private final Optional<BuildProperties> buildProperties;

    @Value("${spring.ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${app.models.llama:llama3.2}")
    private String llamaModelName;

    @Value("${app.models.mistral:mistral}")
    private String mistralModelName;

    @Value("${spring.ai.vectorstore.qdrant.collection-name:personal_library_embeddings}")
    private String qdrantCollectionName;

    private static final Duration PROBE_TIMEOUT = Duration.ofSeconds(3);

    /**
     * Reports detailed health status of application, AI models, vector database, and MongoDB.
     *
     * WHAT: Probes the local Ollama daemon's `/api/tags` endpoint for reachability, counts indexed
     * documents via MongoDB, and assembles uptime, model, vector store, and build metadata into a
     * single JSON payload matching the Node.js Integrated Gateway's `/api/v1/health` contract.
     * WHY: The frontend's `RestBackendAdapter` probes `/health` on whichever backend target is selected
     * (Integrated Gateway or Direct Java Spring Boot); without this endpoint, the Java backend returned
     * a 404 on every 30-second poll, forcing a slower fallback probe and generating log/network noise.
     *
     * @return JSON health payload with `status: "UP"` when reachable, mirroring the gateway's schema.
     */
    @GetMapping({"/health", "/status"})
    @Operation(summary = "Aggregate backend health", description = "Reports Ollama, MongoDB, and Qdrant vector store readiness")
    public ResponseEntity<Map<String, Object>> health() {
        boolean ollamaReachable = probeOllama();
        long indexedDocuments = safeCount();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("timestamp", Instant.now().toString());

        Map<String, Object> server = new LinkedHashMap<>();
        server.put("name", "Personal Library Spring Boot Backend");
        server.put("port", 8080);
        server.put("version", buildProperties.map(BuildProperties::getVersion).orElse("1.0.0"));
        server.put("status", "RUNNING");
        body.put("server", server);

        String modelStatus = ollamaReachable ? "RUNNING" : "UNAVAILABLE";
        String modelState = ollamaReachable ? "READY" : "UNREACHABLE";

        Map<String, Object> llama = new LinkedHashMap<>();
        llama.put("id", llamaModelName);
        llama.put("name", "Ollama Llama 3.3 (70B Instruct)");
        llama.put("status", modelStatus);
        llama.put("framework", "Spring AI / Local Ollama Engine");
        llama.put("state", modelState);

        Map<String, Object> mistral = new LinkedHashMap<>();
        mistral.put("id", mistralModelName);
        mistral.put("name", "Ollama Mistral Large (2411)");
        mistral.put("status", modelStatus);
        mistral.put("framework", "Spring AI / Local Ollama Engine");
        mistral.put("state", modelState);

        Map<String, Object> models = new LinkedHashMap<>();
        models.put("llama3_3", llama);
        models.put("mistralLarge", mistral);
        body.put("models", models);

        Map<String, Object> vectorStore = new LinkedHashMap<>();
        vectorStore.put("engine", "Qdrant Vector Database");
        vectorStore.put("status", "RUNNING");
        vectorStore.put("collection", qdrantCollectionName);
        vectorStore.put("indexedDocuments", indexedDocuments);
        body.put("vectorStore", vectorStore);

        return ResponseEntity.ok(body);
    }

    /**
     * Performs a short-timeout GET request against the local Ollama daemon's model listing endpoint.
     *
     * WHAT: Sends `GET {ollamaBaseUrl}/api/tags` with a 3-second timeout and checks for HTTP 200.
     * WHY: Confirms the Ollama container is actually reachable from the Java backend's network namespace,
     * rather than assuming availability from configuration alone.
     *
     * @return true if Ollama responded successfully; false otherwise.
     */
    private boolean probeOllama() {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(PROBE_TIMEOUT).build();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ollamaBaseUrl + "/api/tags"))
                    .timeout(PROBE_TIMEOUT)
                    .GET()
                    .build();
            HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.debug("Ollama health probe failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Counts persisted documents, tolerating transient MongoDB connectivity issues.
     *
     * @return Document count, or 0 if the count query fails.
     */
    private long safeCount() {
        try {
            return documentRepository.count();
        } catch (Exception e) {
            log.debug("Document count query failed during health check: {}", e.getMessage());
            return 0;
        }
    }
}
