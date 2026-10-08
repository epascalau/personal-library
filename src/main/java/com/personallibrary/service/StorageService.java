/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Service managing physical file asset persistence on disk and universal text extraction
 * across PDF, DOCX, TXT, MD, and office formats using Apache Tika.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Slf4j
@Service
public class StorageService {

    private final Path rootLocation;
    private final Tika tika;

    /**
     * Initializes storage root directory and Apache Tika parser engine.
     *
     * WHAT: Resolves storage root path, instantiates Apache Tika parser, and ensures root directories exist.
     * WHY: Initializing filesystem directories eagerly during service construction prevents file creation race conditions
     * during subsequent high-concurrency document uploads.
     *
     * @param uploadDir Storage root directory path configured in properties.
     */
    public StorageService(@Value("${app.storage.upload-dir:./storage/documents}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir);
        this.tika = new Tika();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize storage directory", e);
        }
    }

    /**
     * Stores a physical uploaded file to the local disk under a unique GUID directory, isolated by version.
     *
     * WHAT: Cleans original filename, creates a per-version subdirectory (guid/v{version}/), and writes stream
     * with REPLACE_EXISTING.
     * WHY: Version-isolated subdirectories ensure each historical revision's physical bytes remain independently
     * addressable on disk, so overwriting the active version never destroys the asset a prior version snapshot
     * or rollback needs to stream back to the client.
     *
     * @param file    Uploaded multipart file.
     * @param guid    Unique document identifier.
     * @param version Version sequence number this asset represents.
     * @return Path to the stored physical file on disk.
     * @throws IOException If file writing fails.
     */
    public Path storeFile(MultipartFile file, String guid, int version) throws IOException {
        String cleanFileName = file.getOriginalFilename() != null ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_") : "document.bin";
        Path targetDir = this.rootLocation.resolve(guid).resolve("v" + version);
        Files.createDirectories(targetDir);
        Path destination = targetDir.resolve(cleanFileName);

        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        log.info("Stored file {} for GUID {} version {} at {}", cleanFileName, guid, version, destination);
        return destination;
    }

    /**
     * Detects the MIME content type of a physical file on disk using Apache Tika.
     *
     * WHAT: Invokes Apache Tika's magic-byte and extension-based content detection.
     * WHY: Allows download endpoints to stream the exact original content type (PDF, DOCX, plain text, etc.)
     * instead of hardcoding or guessing a single MIME type for every document format supported by the library.
     *
     * @param filePath Path to the physical file on disk.
     * @return Detected MIME content type, or "application/octet-stream" on detection failure.
     */
    public String detectContentType(Path filePath) {
        try {
            return tika.detect(filePath.toFile());
        } catch (Exception e) {
            log.warn("Apache Tika could not detect content type for {}: {}", filePath, e.getMessage());
            return "application/octet-stream";
        }
    }

    /**
     * Extracts full plain text content from a file using Apache Tika.
     *
     * WHAT: Invokes Apache Tika parser to extract text across PDF, DOCX, TXT, and office documents with fallback string on failure.
     * WHY: Apache Tika provides content-detection and metadata extraction across hundreds of file types,
     * delivering uniform plain text to downstream vector embedding and summarization pipelines.
     *
     * @param filePath Path to the physical file on disk.
     * @return Extracted plain text string content.
     */
    public String extractTextContent(Path filePath) {
        try {
            File file = filePath.toFile();
            return tika.parseToString(file);
        } catch (Exception e) {
            log.warn("Apache Tika could not parse text from {}: {}", filePath, e.getMessage());
            return "Content extraction fallback for " + filePath.getFileName();
        }
    }

    /**
     * Extracts plain text from an in-memory byte payload that has not been persisted to disk.
     *
     * WHAT: Streams the supplied bytes through Apache Tika to obtain plain text, returning an empty
     * string when the payload is unparseable or carries no text layer.
     * WHY: Pre-upload metadata extraction operates on a transient base64 payload that never reaches the
     * storage root, so the {@link #extractTextContent(Path)} overload cannot be used. Returning an empty
     * string rather than a placeholder lets callers reliably distinguish "no text available" from real
     * content, which matters because the BibTeX extractor skips the LLM when the sample is too short.
     *
     * @param data     Raw file bytes.
     * @param fileName Original filename, used only for diagnostic logging.
     * @return Extracted plain text, or an empty string when no text could be recovered.
     */
    public String extractTextContent(byte[] data, String fileName) {
        if (data == null || data.length == 0) {
            return "";
        }
        try (InputStream stream = new ByteArrayInputStream(data)) {
            String text = tika.parseToString(stream);
            return text == null ? "" : text.trim();
        } catch (Exception e) {
            log.warn("Apache Tika could not parse in-memory payload for {}: {}", fileName, e.getMessage());
            return "";
        }
    }

    /**
     * Purges physical files and directory for a specified document GUID.
     *
     * WHAT: Recursively walks the GUID directory in bottom-up reverse order and deletes each file and subfolder.
     * WHY: Bottom-up deletion ensures child files are deleted before parent directories, guaranteeing clean removal
     * without left-over orphaned disk assets.
     *
     * @param guid Unique document identifier.
     */
    public void deletePhysicalAsset(String guid) {
        try {
            Path targetDir = this.rootLocation.resolve(guid);
            if (Files.exists(targetDir)) {
                Files.walk(targetDir)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(p -> {
                        try {
                            Files.delete(p);
                        } catch (IOException e) {
                            log.error("Failed to delete path {}", p, e);
                        }
                    });
                log.info("Deleted physical storage directory for GUID: {}", guid);
            }
        } catch (IOException e) {
            log.error("Error purging storage for GUID: {}", guid, e);
        }
    }
}

