/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.service;

import com.personallibrary.model.BibTeXMetadata;
import com.personallibrary.model.BibTeXType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.time.Year;
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
                """,
                fileName,
                sampleContent.substring(0, Math.min(sampleContent.length(), 4000))
            );

            String response = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            if (response != null) {
                String json = cleanJsonResponse(response);
                @SuppressWarnings("unchecked")
                Map<String, Object> map = jsonMapper.readValue(json, Map.class);

                return BibTeXMetadata.builder()
                        .entryType(BibTeXType.fromString((String) map.getOrDefault("entryType", "misc")))
                        .bibKey((String) map.getOrDefault("bibKey", defaultKey))
                        .title((String) map.getOrDefault("title", cleanTitle))
                        .author((String) map.getOrDefault("author", "Unknown Author"))
                        .year((String) map.getOrDefault("year", currentYear))
                        .month((String) map.get("month"))
                        .journal((String) map.get("journal"))
                        .booktitle((String) map.get("booktitle"))
                        .volume((String) map.get("volume"))
                        .number((String) map.get("number"))
                        .pages((String) map.get("pages"))
                        .publisher((String) map.get("publisher"))
                        .edition((String) map.get("edition"))
                        .institution((String) map.get("institution"))
                        .school((String) map.get("school"))
                        .doi((String) map.get("doi"))
                        .url((String) map.get("url"))
                        .abstractText((String) map.get("abstract"))
                        .keywords((String) map.get("keywords"))
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
     * Strips Markdown code fence formatting (` ```json ... ``` `) from model responses.
     *
     * WHAT: Removes leading and trailing Markdown code fences and whitespace from raw LLM outputs.
     * WHY: LLM chat models frequently wrap JSON outputs in Markdown code blocks; stripping fences ensures
     * reliable Jackson deserialization without formatting syntax errors.
     *
     * @param raw Raw response text from the LLM.
     * @return Clean JSON string suitable for ObjectMapper parsing.
     */
    private String cleanJsonResponse(String raw) {
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
}

