/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.service;

import com.personallibrary.model.BibTeXMetadata;
import com.personallibrary.model.SummaryRecord;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Service orchestrating dual-model AI summarization via Spring AI and Ollama:
 * <ul>
 *   <li><b>Llama 3.3 (70B Instruct):</b> Produces structured, technical and analytical synthesis.</li>
 *   <li><b>Mistral Large (2411):</b> Produces high-impact executive and operational overviews.</li>
 * </ul>
 * Tracks execution durations in seconds and user-friendly minutes/seconds formatting.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Slf4j
@Service
public class AiSummarizationService {

    private final ChatClient llamaChatClient;
    private final ChatClient mistralChatClient;

    /**
     * Constructs the summarization service with qualified model chat clients.
     *
     * WHAT: Injects Spring AI ChatClients specifically bound to Llama and Mistral chat models.
     * WHY: Separates model client references by qualifier name to ensure distinct temperature and model parameters.
     *
     * @param llamaChatClient   Chat client configured for Llama 3.3 inference.
     * @param mistralChatClient Chat client configured for Mistral Large inference.
     */
    public AiSummarizationService(
            @Qualifier("llamaChatClient") ChatClient llamaChatClient,
            @Qualifier("mistralChatClient") ChatClient mistralChatClient) {
        this.llamaChatClient = llamaChatClient;
        this.mistralChatClient = mistralChatClient;
    }

    /**
     * Computes dual-model summaries automatically upon document ingestion:
     * 1. Llama model: in-depth technical & analytical synthesis
     * 2. Mistral model: high-impact executive operational synthesis
     *
     * WHAT: Consecutively calls `generateSummaryForModel` for both "llama" and "mistral" and returns a composite map.
     * WHY: Produces both analytical and executive viewpoints in a single pipeline run during document upload,
     * ensuring immediate availability of dual summaries when opening the SAP Horizon Object Page.
     *
     * @param title   Document title.
     * @param content Raw extracted text content.
     * @param bibtex  Structured bibliographic metadata.
     * @return Map containing "llama" and "mistral" {@link SummaryRecord} entries.
     */
    public Map<String, SummaryRecord> generateDualSummaries(String title, String content, BibTeXMetadata bibtex) {
        Map<String, SummaryRecord> summaries = new HashMap<>();

        // 1. Generate with Llama
        SummaryRecord llamaRecord = generateSummaryForModel("llama", title, content, bibtex);
        summaries.put("llama", llamaRecord);

        // 2. Generate with Mistral
        SummaryRecord mistralRecord = generateSummaryForModel("mistral", title, content, bibtex);
        summaries.put("mistral", mistralRecord);

        return summaries;
    }

    /**
     * Generates or regenerates a summary for a specific target model with precise duration telemetry.
     *
     * WHAT: Truncates content to a 6,000 character prompt window, selects model-specific system prompts,
     * executes inference via Spring AI ChatClient, measures execution duration, and constructs a SummaryRecord.
     * WHY: Truncating to 6,000 characters balances representative context coverage with rapid response times;
     * timing telemetry provides users with concrete insight into model inference performance.
     *
     * @param modelKey Target model engine ("llama" or "mistral").
     * @param title    Document title.
     * @param content  Raw text content.
     * @param bibtex   Bibliographic metadata.
     * @return Completed {@link SummaryRecord} with markdown content and timing metrics.
     */
    public SummaryRecord generateSummaryForModel(String modelKey, String title, String content, BibTeXMetadata bibtex) {
        long startTime = System.currentTimeMillis();
        String summaryText;
        String modelName;

        String excerpt = content.substring(0, Math.min(content.length(), 6000));

        if ("llama".equalsIgnoreCase(modelKey)) {
            modelName = "Ollama Llama 3.3 (70B Instruct)";
            String prompt = String.format("""
                You are Ollama Llama 3.3 running in Spring AI.
                Provide an in-depth analytical summary for the document: "%s".
                Author: %s, Year: %s.
                Document Excerpt:
                %s

                Include:
                ### Analytical Synthesis (Llama 3.3)
                **Core Premise:** ...
                **Key Technical Findings:**
                1. ...
                2. ...
                3. ...
                **Methodology / Conceptual Framework:** ...
                **Implications & Significance:** ...
                """,
                title,
                bibtex != null ? bibtex.getAuthor() : "Unknown",
                bibtex != null ? bibtex.getYear() : "2024",
                excerpt
            );

            try {
                summaryText = llamaChatClient.prompt()
                        .user(prompt)
                        .call()
                        .content();
            } catch (Exception e) {
                log.error("Failed to generate Llama summary: {}", e.getMessage());
                summaryText = "### Analytical Synthesis (Llama 3.3)\n\n*Unable to generate summary due to model service communication error.*";
            }
        } else {
            modelName = "Ollama Mistral Large (2411)";
            String prompt = String.format("""
                You are Ollama Mistral Large running in Spring AI.
                Provide an executive, high-impact operational summary for the document: "%s".
                Author: %s, Year: %s.
                Document Excerpt:
                %s

                Include:
                ### Executive & Operational Summary (Mistral)
                **Strategic Overview:** ...
                **Actionable Takeaways:**
                - ...
                - ...
                - ...
                **Recommended Use Cases:** ...
                """,
                title,
                bibtex != null ? bibtex.getAuthor() : "Unknown",
                bibtex != null ? bibtex.getYear() : "2024",
                excerpt
            );

            try {
                summaryText = mistralChatClient.prompt()
                        .user(prompt)
                        .call()
                        .content();
            } catch (Exception e) {
                log.error("Failed to generate Mistral summary: {}", e.getMessage());
                summaryText = "### Executive & Operational Summary (Mistral)\n\n*Unable to generate summary due to model service communication error.*";
            }
        }

        long elapsedMs = System.currentTimeMillis() - startTime;
        double durationSeconds = elapsedMs / 1000.0;
        String durationFormatted = SummaryRecord.formatDuration(durationSeconds);

        return SummaryRecord.builder()
                .modelName(modelName)
                .modelKey(modelKey.toLowerCase())
                .summaryText(summaryText)
                .createdAt(Instant.now())
                .timestamp(Instant.now().toString())
                .durationSeconds(durationSeconds)
                .durationFormatted(durationFormatted)
                .build();
    }
}

