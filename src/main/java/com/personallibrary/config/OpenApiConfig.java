package com.personallibrary.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 3.0.3 and Swagger UI configuration.
 * Generates API documentation contracts and defines Keycloak Bearer JWT security schemes.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Configuration
public class OpenApiConfig {

    /**
     * Constructs the root OpenAPI specification document.
     *
     * @return Fully configured {@link OpenAPI} object.
     */
    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "KeycloakBearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("Personal Library API")
                        .version("1.0.0")
                        .description("Enterprise-grade AI document management system API. Supports document uploads, BibTeX metadata auto-extraction, vector-powered semantic search, dual-model AI summarization (Llama and Mistral), and document RAG conversational chat.")
                        .contact(new Contact()
                                .name("Personal Library Architecture Team")
                                .email("support@personallibrary.io")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Keycloak OIDC Bearer Token")));
    }
}
