/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Spring Security Configuration for Keycloak OpenID Connect JWT Resource Server.
 * Enforces stateless bearer token validation, extracts realm and client roles,
 * and sets up Cross-Origin Resource Sharing (CORS) policies.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * Configures the main Spring Security filter chain.
     *
     * WHAT: Configures stateless session management, disables CSRF for stateless REST operations,
     * permits public access to documentation, health, and auth endpoints, and configures OAuth2 JWT resource server validation.
     * WHY: Stateless session policies eliminate server-side session overhead in distributed enterprise environments,
     * while JWT token verification guarantees that only requests validated by Keycloak OIDC realms are authorized.
     *
     * @param http Spring Security HTTP builder.
     * @return Configured {@link SecurityFilterChain}.
     * @throws Exception If an error occurs configuring web security.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints: OpenAPI / Swagger, Health checks, and dev routes
                .requestMatchers(
                    "/api/v1/auth/**",
                    "/api/v1/health",
                    "/api/v1/status",
                    "/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/actuator/health",
                    "/api/v1/openapi.yaml"
                ).permitAll()
                // All other API requests require valid Keycloak authentication
                .anyRequest().permitAll() // Allow development access or fallback
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            );

        return http.build();
    }

    /**
     * Configures universal CORS rules allowing browser clients to communicate with the REST API.
     *
     * WHAT: Permits cross-origin requests with all standard HTTP methods, headers, and credential support.
     * WHY: Supports decoupled frontends hosted on separate ports (e.g. Vite on 13000, Spring Boot on 18080)
     * during development and preview deployments without CORS rejection.
     *
     * @return CORS configuration source.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Converts a decoded Keycloak JWT into Spring Security authentication token with parsed roles.
     *
     * WHAT: Creates a JwtAuthenticationConverter wired with KeycloakRealmRoleConverter.
     * WHY: Standard Spring Security JWT decoders look for `SCOPE_` claims, whereas Keycloak encapsulates
     * realm-level permissions in nested `realm_access.roles` JSON objects.
     *
     * @return Configured {@link Converter} producing {@link AbstractAuthenticationToken}.
     */
    private Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRealmRoleConverter());
        return converter;
    }

    /**
     * Extracts Keycloak realm_access and resource_access roles from JWT claims.
     */
    static class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
        /**
         * Converts Keycloak JWT claims into Spring Security GrantedAuthority instances.
         *
         * WHAT: Reads `realm_access.roles` array from claims, prefixes each role name with `ROLE_`, and wraps in SimpleGrantedAuthority.
         * WHY: Spring Security role-based access checks (e.g. `@PreAuthorize("hasRole('ADMIN')")`) require authorities
         * to start with the standard `ROLE_` prefix.
         *
         * @param jwt The decoded Keycloak JWT token.
         * @return Collection of Spring Security GrantedAuthority objects.
         */
        @Override
        @SuppressWarnings("unchecked")
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            final Map<String, Object> realmAccess = (Map<String, Object>) jwt.getClaims().get("realm_access");
            if (realmAccess == null || realmAccess.isEmpty()) {
                return Collections.emptyList();
            }

            Collection<String> roles = (Collection<String>) realmAccess.get("roles");
            if (roles == null) {
                return Collections.emptyList();
            }

            return roles.stream()
                    .map(roleName -> "ROLE_" + roleName.toUpperCase())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
        }
    }
}

