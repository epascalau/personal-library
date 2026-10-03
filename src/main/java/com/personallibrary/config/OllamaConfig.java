package com.personallibrary.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

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

    @Value("${spring.ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${app.models.llama:llama3.2}")
    private String llamaModelName;

    @Value("${app.models.mistral:mistral}")
    private String mistralModelName;

    /**
     * Initializes the low-level Ollama API client.
     *
     * @return Configured {@link OllamaApi} pointing to the host server.
     */
    @Bean
    public OllamaApi ollamaApi() {
        return OllamaApi.builder()
                .baseUrl(ollamaBaseUrl)
                .build();
    }

    /**
     * Primary ChatModel configured with Llama 3.3 model specifications.
     *
     * @param ollamaApi Low-level Ollama API client.
     * @return {@link OllamaChatModel} configured for Llama inference.
     */
    @Bean(name = "llamaChatModel")
    @Primary
    public OllamaChatModel llamaChatModel(OllamaApi ollamaApi) {
        return OllamaChatModel.builder()
                .ollamaApi(ollamaApi)
                .defaultOptions(OllamaOptions.builder()
                        .model(llamaModelName)
                        .temperature(0.2)
                        .build())
                .build();
    }

    /**
     * Secondary ChatModel configured with Mistral Large model specifications.
     *
     * @param ollamaApi Low-level Ollama API client.
     * @return {@link OllamaChatModel} configured for Mistral inference.
     */
    @Bean(name = "mistralChatModel")
    public OllamaChatModel mistralChatModel(OllamaApi ollamaApi) {
        return OllamaChatModel.builder()
                .ollamaApi(ollamaApi)
                .defaultOptions(OllamaOptions.builder()
                        .model(mistralModelName)
                        .temperature(0.3)
                        .build())
                .build();
    }

    /**
     * Fluent ChatClient wrapper for the primary Llama chat model.
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
     * @param mistralChatModel Mistral Chat Model.
     * @return Configured {@link ChatClient}.
     */
    @Bean(name = "mistralChatClient")
    public ChatClient mistralChatClient(OllamaChatModel mistralChatModel) {
        return ChatClient.builder(mistralChatModel).build();
    }
}
