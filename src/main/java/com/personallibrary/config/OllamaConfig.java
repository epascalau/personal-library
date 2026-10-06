/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Spring AI Ollama configuration establishing dual model clients:
 * <ul>
 *   <li><b>Llama 3.3 (70B Instruct):</b> Primary model for in-depth technical analysis and RAG conversation.</li>
 *   <li><b>Mistral Large (2411):</b> Secondary model for high-impact executive operational synthesis.</li>
 * </ul>
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Configuration
public class OllamaConfig {

    /**
     * Read timeout applied to the underlying HTTP client used to call Ollama.
     *
     * WHY: CPU-bound local Ollama inference can legitimately take several minutes per chat
     * completion (observed ~2.5 minutes for a single Mistral summarization call), so the
     * default REST client timeout must be raised well above typical cloud-API expectations
     * to avoid prematurely aborting genuinely in-progress generations.
     */
    private static final Duration OLLAMA_READ_TIMEOUT = Duration.ofMinutes(10);
    private static final Duration OLLAMA_CONNECT_TIMEOUT = Duration.ofSeconds(10);

    @Value("${spring.ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${app.models.llama:llama3.2}")
    private String llamaModelName;

    @Value("${app.models.mistral:mistral}")
    private String mistralModelName;

    /**
     * Initializes the low-level Ollama API client.
     *
     * WHAT: Constructs an OllamaApi client instance pointing to the configured Ollama base URL,
     * using a {@link RestClient} whose request factory applies a generous read timeout.
     * WHY: Centralizes HTTP communication and REST connectivity to the local or remote Ollama daemon,
     * ensuring connection pooling, uniform base URL resolution, and sufficient read timeouts for
     * slow, CPU-bound local inference across all downstream chat models.
     *
     * @return Configured {@link OllamaApi} pointing to the host server.
     */
    @Bean
    public OllamaApi ollamaApi() {
        HttpClientSettings settings = HttpClientSettings.defaults()
                .withConnectTimeout(OLLAMA_CONNECT_TIMEOUT)
                .withReadTimeout(OLLAMA_READ_TIMEOUT);
        RestClient.Builder restClientBuilder = RestClient.builder()
                .requestFactory(ClientHttpRequestFactoryBuilder.detect().build(settings));
        return OllamaApi.builder()
                .baseUrl(ollamaBaseUrl)
                .restClientBuilder(restClientBuilder)
                .build();
    }

    /**
     * Primary ChatModel configured with Llama 3.3 model specifications.
     *
     * WHAT: Instantiates an OllamaChatModel backed by Llama 3.3 with temperature set to 0.2.
     * WHY: Lower temperature (0.2) promotes rigorous factual precision, strict citation grounding,
     * and minimal hallucination when analyzing complex academic literature, codebases, and RAG contexts.
     *
     * @param ollamaApi Low-level Ollama API client.
     * @return {@link OllamaChatModel} configured for Llama inference.
     */
    @Bean(name = "llamaChatModel")
    @Primary
    public OllamaChatModel llamaChatModel(OllamaApi ollamaApi) {
        return OllamaChatModel.builder()
                .ollamaApi(ollamaApi)
                .options(OllamaChatOptions.builder()
                        .model(llamaModelName)
                        .temperature(0.2)
                        .build())
                .build();
    }

    /**
     * Secondary ChatModel configured with Mistral Large model specifications.
     *
     * WHAT: Instantiates an OllamaChatModel backed by Mistral Large with temperature set to 0.3.
     * WHY: A slightly higher temperature (0.3) enables fluent, expressive natural language synthesis
     * optimal for high-level executive summaries, architectural takeaways, and concise abstractive overviews.
     *
     * @param ollamaApi Low-level Ollama API client.
     * @return {@link OllamaChatModel} configured for Mistral inference.
     */
    @Bean(name = "mistralChatModel")
    public OllamaChatModel mistralChatModel(OllamaApi ollamaApi) {
        return OllamaChatModel.builder()
                .ollamaApi(ollamaApi)
                .options(OllamaChatOptions.builder()
                        .model(mistralModelName)
                        .temperature(0.3)
                        .build())
                .build();
    }

    /**
     * Fluent ChatClient wrapper for the primary Llama chat model.
     *
     * WHAT: Constructs a high-level Spring AI ChatClient wrapping the primary LlamaChatModel.
     * WHY: Provides a fluent, builder-based prompt composition API with prompt templates and system prompt
     * injection capabilities for analytical processing and RAG answering.
     *
     * @param llamaChatModel Llama Chat Model.
     * @return Configured {@link ChatClient}.
     */
    @Bean(name = "llamaChatClient")
    public ChatClient llamaChatClient(OllamaChatModel llamaChatModel) {
        return ChatClient.builder(llamaChatModel).build();
    }

    /**
     * Fluent ChatClient wrapper for the secondary Mistral chat model.
     *
     * WHAT: Constructs a high-level Spring AI ChatClient wrapping the secondary MistralChatModel.
     * WHY: Simplifies prompt assembly and response extraction for executive summarization pipelines
     * using Spring AI's modern ChatClient abstractions.
     *
     * @param mistralChatModel Mistral Chat Model.
     * @return Configured {@link ChatClient}.
     */
    @Bean(name = "mistralChatClient")
    public ChatClient mistralChatClient(OllamaChatModel mistralChatModel) {
        return ChatClient.builder(mistralChatModel).build();
    }
}

