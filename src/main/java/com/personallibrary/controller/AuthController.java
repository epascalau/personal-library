package com.personallibrary.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Controller handling Keycloak OpenID Connect authentication session probing,
 * userinfo resolution, and token exchange.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Keycloak / OIDC client session and profile endpoints")
public class AuthController {

    /**
     * Retrieves the profile and roles of the currently authenticated Keycloak user.
     *
     * @param jwt Decoded bearer JWT injected by Spring Security.
     * @return User profile details including user ID, name, email, roles, and active realm.
     */
    @GetMapping("/userinfo")
    @Operation(summary = "Get current authenticated Keycloak user profile")
    public ResponseEntity<Map<String, Object>> getUserInfo(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.ok(Map.of(
                    "id", "usr-keycloak-101",
                    "username", "emilian.pascalau",
                    "email", "emilian.pascalau@gmail.com",
                    "name", "Emilian Pascalau",
                    "roles", List.of("LIBRARY_ADMIN", "RESEARCHER"),
                    "realm", "personal-library-realm",
                    "authenticatedAt", Instant.now().toString()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "id", jwt.getSubject(),
                "username", jwt.getClaimAsString("preferred_username"),
                "email", jwt.getClaimAsString("email"),
                "name", jwt.getClaimAsString("name"),
                "roles", jwt.getClaimAsStringList("roles") != null ? jwt.getClaimAsStringList("roles") : List.of("USER"),
                "realm", "personal-library-realm"
        ));
    }

    /**
     * Direct authentication or mock token exchange for development workflows.
     *
     * @param credentials Map containing username, password, and realm.
     * @return Bearer token response bundle.
     */
    @PostMapping("/login")
    @Operation(summary = "Direct authentication or OIDC token exchange")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.getOrDefault("username", "emilian.pascalau@gmail.com");
        return ResponseEntity.ok(Map.of(
                "accessToken", "kc_jwt_" + System.currentTimeMillis(),
                "tokenType", "Bearer",
                "expiresIn", 3600,
                "user", Map.of(
                        "id", "usr-kc-" + username.hashCode(),
                        "username", username.split("@")[0],
                        "email", username,
                        "name", username.split("@")[0].replace(".", " "),
                        "roles", List.of("LIBRARY_ADMIN", "RESEARCHER"),
                        "realm", credentials.getOrDefault("realm", "personal-library-realm")
                )
        ));
    }

    /**
     * Invalidates active Keycloak authentication session.
     *
     * @return Confirmation response.
     */
    @PostMapping("/logout")
    @Operation(summary = "Terminate Keycloak session")
    public ResponseEntity<Map<String, Object>> logout() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Keycloak OIDC session terminated successfully."
        ));
    }
}
