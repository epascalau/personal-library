/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.service;

import com.personallibrary.model.BibTeXMetadata;
import com.personallibrary.model.BibTeXType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.time.Year;
import java.util.List;
import java.util.Map;

/**
 * Service utilizing Spring AI and Ollama LLM to automatically parse document content
 * and extract structured bibliographic metadata adhering to RFC BibTeX specifications.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Slf4j
@Service
public class BibTeXExtractionService {

    private final ChatClient chatClient;
    private final JsonMapper jsonMapper;

    /**
     * Constructs the extraction service with the primary AI chat client.
     *
     * WHAT: Injects the Llama ChatClient and Spring Boot's auto-configured Jackson 3 {@link JsonMapper}
     * (replacing the Jackson 2 {@code ObjectMapper} used prior to the Spring Boot 4 migration) for
     * parsing LLM JSON responses.
     * WHY: Employs Llama 3.3's analytical comprehension to extract bibliographic fields from messy document text.
     *
     * @param chatClient Llama AI chat client.
     * @param jsonMapper Jackson 3 JSON mapper.
     */
    public BibTeXExtractionService(@Qualifier("llamaChatClient") ChatClient chatClient, JsonMapper jsonMapper) {
        this.chatClient = chatClient;
        this.jsonMapper = jsonMapper;
    }

    /**
     * Analyzes document text and filename to infer bibliographic attributes and assemble a {@link BibTeXMetadata} record.
     *
     * WHAT: Sends a structured JSON extraction prompt containing filename and a 4,000-character text sample to Llama,
     * parses the returned JSON, and builds a populated BibTeXMetadata instance; falls back to heuristic metadata on failure.
     * WHY: Eliminates manual data entry by extracting title, authors, year, publication venue, DOI, and keywords directly
     * from document front matter, with graceful fallback ensuring upload operations never fail even if the LLM is offline.
     *
     * @param fileName      Physical filename of the document.
     * @param sampleContent Extracted plain text content excerpt.
     * @return Fully populated {@link BibTeXMetadata} object.
     */
    public BibTeXMetadata extractMetadata(String fileName, String sampleContent) {
        String cleanTitle = fileName.replaceFirst("[.][^.]+$", "").replaceAll("[_-]", " ");
        String currentYear = String.valueOf(Year.now().getValue());
        String defaultKey = fileName.toLowerCase().replaceAll("[^a-z0-9]", "_").substring(0, Math.min(16, fileName.length()));

        if (sampleContent == null || sampleContent.trim().length() < 30) {
            return fallbackMetadata(cleanTitle, currentYear, defaultKey);
        }

        try {
            String prompt = String.format("""
                Extract academic/technical publication metadata from the following document into JSON for BibTeX.
                File Name: "%s"
                Text Preview:
                %s

                Return ONLY a JSON object with:
                - entryType: one of "article", "book", "inproceedings", "techreport", "phdthesis", "misc"
                - bibKey: short unique key (e.g. author2024title)
                - title: string
                - author: string
                - year: string
                - month: string (optional)
                - journal: string (if article)
                - booktitle: string (if inproceedings)
                - volume: string (optional)
                - number: string (optional)
                - pages: string (optional)
                - publisher: string (optional)
                - edition: string (optional)
                - institution: string (optional)
                - doi: string (optional)
                - url: string (optional)
                - abstract: short summary string
                - keywords: comma-separated keywords

                Return a single flat JSON object, never an array and never wrapped in another object.
                Omit any field you cannot determine from the text rather than guessing or emitting
                placeholders such as "N/A", "Unknown", or an empty string.
                """,
                fileName,
                sampleContent.substring(0, Math.min(sampleContent.length(), 4000))
            );

            String response = chatClient.prompt()
                    .user(prompt)
                    .options(OllamaChatOptions.builder()
                            .format("json")
                            .temperature(0.0d))
                    .call()
                    .content();

            if (response != null) {
                Map<String, Object> map = parseMetadataJson(response);
                if (map == null) {
                    log.warn("Ollama BibTeX extraction returned unparseable payload for {}, falling back to heuristics", fileName);
                    return fallbackMetadata(cleanTitle, currentYear, defaultKey);
                }

                return BibTeXMetadata.builder()
                        .entryType(BibTeXType.fromString(text(map, "entryType", "misc")))
                        .bibKey(text(map, "bibKey", defaultKey))
                        .title(text(map, "title", cleanTitle))
                        .author(text(map, "author", "Unknown Author"))
                        .year(text(map, "year", currentYear))
                        .month(text(map, "month", null))
                        .journal(text(map, "journal", null))
                        .booktitle(text(map, "booktitle", null))
                        .volume(text(map, "volume", null))
                        .number(text(map, "number", null))
                        .pages(text(map, "pages", null))
                        .publisher(text(map, "publisher", null))
                        .edition(text(map, "edition", null))
                        .institution(text(map, "institution", null))
                        .school(text(map, "school", null))
                        .doi(text(map, "doi", null))
                        .url(text(map, "url", null))
                        .abstractText(text(map, "abstract", null))
                        .keywords(text(map, "keywords", null))
                        .build();
            }
        } catch (Exception e) {
            log.warn("Ollama BibTeX extraction encountered an error, falling back to heuristics: {}", e.getMessage());
        }

        return fallbackMetadata(cleanTitle, currentYear, defaultKey);
    }

    /**
     * Synthesizes sensible fallback bibliographic metadata from filename and system defaults.
     *
     * WHAT: Constructs a BibTeXMetadata record populated with cleaned file title, current year, and default citation key.
     * WHY: Guarantees that documents uploaded without internet access or with unsupported layouts still receive valid,
     * queryable metadata records in the library catalogue.
     *
     * @param title Sanitized document title.
     * @param year  Default publication year.
     * @param key   Generated fallback BibTeX key.
     * @return Minimal valid BibTeXMetadata instance.
     */
    private BibTeXMetadata fallbackMetadata(String title, String year, String key) {
        return BibTeXMetadata.builder()
                .entryType(BibTeXType.MISC)
                .bibKey(key)
                .title(title)
                .author("Unknown Author")
                .year(year)
                .publisher("Personal Library Repository")
                .edition("1st Edition")
                .abstractText("Document catalogued for personal research and semantic indexing.")
                .keywords("document, research, knowledge-base")
                .build();
    }

    /**
     * Reads a string field from the parsed LLM response, falling back when absent, null, or blank.
     *
     * WHAT: Coerces the value at {@code key} to a trimmed string, returning {@code fallback} when the entry
     * is missing, JSON null, a non-string, or an empty/whitespace string. Also treats the literal strings
     * {@code "null"}, {@code "n/a"}, and {@code "unknown"} as absent.
     * WHY: {@code Map.getOrDefault} only substitutes when the key is absent, but LLMs habitually emit
     * {@code "doi": ""} or {@code "author": "N/A"} for fields they could not determine. Without this guard
     * those placeholders are persisted as real metadata and surface as blank or junk values in the catalogue.
     *
     * @param map      Parsed JSON response.
     * @param key      Field name to read.
     * @param fallback Value to use when the field carries no usable content.
     * @return Trimmed field value, or {@code fallback}.
     */
    private String text(Map<String, Object> map, String key, String fallback) {
        Object value = map.get(key);
        if (!(value instanceof String str)) {
            return value == null ? fallback : String.valueOf(value);
        }
        String trimmed = str.trim();
        if (trimmed.isEmpty()
                || trimmed.equalsIgnoreCase("null")
                || trimmed.equalsIgnoreCase("n/a")
                || trimmed.equalsIgnoreCase("unknown")) {
            return fallback;
        }
        return trimmed;
    }

    /**
     * Parses the metadata object out of a raw LLM response.
     *
     * WHAT: Strips Markdown code fences and conversational prose, isolates the first balanced JSON value,
     * and unwraps a single-element array wrapper, returning the resulting object as a map or {@code null}
     * when no usable object can be recovered.
     * WHY: Even with Ollama's JSON mode requested, local models are inconsistent. Observed responses have
     * included a "Here is the extracted metadata:" preamble, a ` ```json ` fence, the object wrapped in a
     * top-level array, and trailing commentary after the closing brace. Naive fence-stripping left the
     * prose in place and naive first-brace/last-brace slicing broke on the array wrapper, so every
     * extraction silently degraded to heuristic fallback metadata. Balanced scanning plus array unwrapping
     * tolerates all four decorations.
     *
     * @param raw Raw response text from the LLM.
     * @return Parsed metadata map, or {@code null} when the payload cannot be interpreted.
     */
    private Map<String, Object> parseMetadataJson(String raw) {
        String clean = stripCodeFences(raw);

        int objectStart = clean.indexOf('{');
        int arrayStart = clean.indexOf('[');
        boolean arrayFirst = arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart);
        int start = arrayFirst ? arrayStart : objectStart;
        if (start < 0) {
            return null;
        }

        String candidate = sliceBalanced(clean, start);
        if (candidate == null) {
            return null;
        }

        try {
            Object parsed = jsonMapper.readValue(candidate, Object.class);
            if (parsed instanceof List<?> list) {
                parsed = list.stream().filter(Map.class::isInstance).findFirst().orElse(null);
            }
            if (parsed instanceof Map<?, ?> map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) map;
                return result;
            }
            return null;
        } catch (Exception e) {
            log.warn("Could not deserialize extracted BibTeX JSON payload: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Removes Markdown code fence decoration from a raw model response.
     *
     * @param raw Raw response text.
     * @return Response with surrounding fences and whitespace removed.
     */
    private String stripCodeFences(String raw) {
        String clean = raw.trim();
        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        return clean.trim();
    }

    /**
     * Extracts the balanced JSON value beginning at {@code start}.
     *
     * WHAT: Walks forward tracking brace and bracket depth while skipping over string literals and their
     * escape sequences, returning the substring that closes the opening delimiter.
     * WHY: Depth tracking is what distinguishes this from a last-brace search: braces and brackets appearing
     * inside the extracted abstract, inside embedded code samples, or in trailing commentary no longer
     * corrupt the slice. String-awareness prevents a brace inside a quoted value from shifting the depth.
     *
     * @param text  Cleaned response text.
     * @param start Index of the opening {@code &#123;} or {@code [}.
     * @return Balanced JSON substring, or {@code null} when the value is never closed.
     */
    private String sliceBalanced(String text, int start) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;

        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);

            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }

            if (c == '"') {
                inString = true;
            } else if (c == '{' || c == '[') {
                depth++;
            } else if (c == '}' || c == ']') {
                depth--;
                if (depth == 0) {
                    return text.substring(start, i + 1);
                }
            }
        }
        return null;
    }
}

