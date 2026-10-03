package com.personallibrary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enterprise Personal Library Application.
 * <p>
 * Main Spring Boot entry point providing enterprise document management,
 * automated BibTeX metadata extraction, dual-model analytical and executive summarization
 * via Ollama (Llama 3.3 and Mistral Large), Qdrant vector retrieval-augmented generation (RAG),
 * and Keycloak OpenID Connect authentication.
 * </p>
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@SpringBootApplication
@EnableAsync
@ConfigurationPropertiesScan
public class PersonalLibraryApplication {

    /**
     * Bootstraps the Spring Boot application container.
     *
     * @param args Command-line arguments passed during startup.
     */
    public static void main(String[] args) {
        SpringApplication.run(PersonalLibraryApplication.class, args);
    }
}
