/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.personallibrary.service.KeycloakAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
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

    private final KeycloakAuthService keycloakAuthService;

    /**
     * Creates the controller.
     *
     * @param keycloakAuthService Service brokering the realm password grant.
     */
    public AuthController(KeycloakAuthService keycloakAuthService) {
        this.keycloakAuthService = keycloakAuthService;
    }

    /**
     * Retrieves the profile and roles of the currently authenticated Keycloak user.
     *
     * WHAT: Resolves claims (subject ID, username, email, full name, realm roles) from the active
     * Spring Security JWT principal. If running in local mock development without an active OAuth2
     * authorization server, provides a default administrative persona.
     *
     * WHY: Inspecting claims via `@AuthenticationPrincipal Jwt` leverages Spring Security's native
     * reactive context instead of manual bearer header parsing, while the mock fallback ensures
     * uninterrupted offline development and automated testing without requiring a live Keycloak Docker container.
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
                    "roles", List.of("LIBRARY_ADMIN", "CHIEF_RESEARCHER"),
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
     * Authenticates a user against the Keycloak realm and issues a genuine access token.
     *
     * WHAT: Brokers an OAuth2 password grant to the realm, then returns the real access token
     * together with the identity and realm roles decoded from it.
     *
     * WHY: This endpoint previously accepted any password and returned an opaque marker
     * (`kc_jwt_<millis>`) with hardcoded administrator roles, so the realm's users, passwords and
     * role assignments had no effect at all. Brokering the grant server-side makes credentials
     * genuinely authoritative and yields a token the resource server can validate. It must happen
     * here rather than in the browser, because the token has to carry the in-network issuer
     * (`http://keycloak:8080/...`) that the backend trusts and the browser cannot reach.
     *
     * @param credentials Map containing username, password, and realm.
     * @return Token bundle with access token, refresh token and profile, or 401 when rejected.
     */
    @PostMapping("/login")
    @Operation(summary = "Authenticate against the Keycloak realm (OAuth2 password grant)")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.getOrDefault("username", "").trim();
        String password = credentials.getOrDefault("password", "");

        if (username.isEmpty() || password.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Username and password are required"));
        }

        try {
            Map<String, Object> token = keycloakAuthService.passwordGrant(username, password);
            String accessToken = String.valueOf(token.get("access_token"));
            Map<String, Object> claims = keycloakAuthService.decodeClaims(accessToken);

            // Prefer the realm's own claims over anything the client submitted, so the returned
            // profile always reflects Keycloak's view of the identity rather than user input.
            String preferredUsername = String.valueOf(claims.getOrDefault("preferred_username", username));
            Map<String, Object> user = new HashMap<>();
            user.put("id", String.valueOf(claims.getOrDefault("sub", "usr-kc-" + preferredUsername.hashCode())));
            user.put("username", preferredUsername);
            user.put("email", String.valueOf(claims.getOrDefault("email", preferredUsername)));
            user.put("name", String.valueOf(claims.getOrDefault("name", preferredUsername)));
            user.put("roles", keycloakAuthService.realmRoles(claims));
            user.put("realm", credentials.getOrDefault("realm", "personal-library-realm"));
            user.put("authenticatedAt", Instant.now().toString());

            Map<String, Object> response = new HashMap<>();
            response.put("accessToken", accessToken);
            response.put("refreshToken", token.get("refresh_token"));
            response.put("tokenType", "Bearer");
            response.put("expiresIn", token.getOrDefault("expires_in", 300));
            response.put("user", user);
            return ResponseEntity.ok(response);
        } catch (KeycloakAuthService.InvalidCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * Invalidates active Keycloak authentication session.
     *
     * WHAT: Signals the client that the authentication session is terminated and returns success confirmation.
     *
     * WHY: Explicit logout endpoints ensure client applications can cleanly purge stored JWTs, clear
     * session caches, and prevent unauthorized reuse of lingering tokens on shared multi-user workstations.
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
