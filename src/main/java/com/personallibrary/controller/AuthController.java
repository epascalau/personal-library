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
            return ResponseEntity.ok(buildSession(
                    token, credentials.getOrDefault("realm", "personal-library-realm"), username));
        } catch (KeycloakAuthService.InvalidCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * Renews an expiring session from a refresh token, without re-prompting for credentials.
     *
     * WHAT: Brokers an OAuth2 `refresh_token` grant and returns the same session payload shape as
     * {@link #login(Map)} — a new access token, a new refresh token and the decoded profile.
     *
     * WHY: Access tokens are short-lived on purpose, so without this endpoint an active user is
     * forcibly signed out the moment one expires, losing whatever they were doing. The client
     * schedules a call here shortly before expiry and swaps the tokens in place, making the
     * session continuous for as long as the user keeps working while still bounding how long any
     * single leaked access token remains usable.
     *
     * <p>Returning the full profile rather than only the token keeps the client's stored identity
     * in step with the realm: a role granted or revoked mid-session takes effect on the next
     * refresh instead of lingering until the next manual sign-in.
     *
     * @param payload Map containing the refresh token under {@code refreshToken}.
     * @return Fresh token bundle with profile, or 401 when the refresh token is no longer valid.
     */
    @PostMapping("/refresh")
    @Operation(summary = "Renew an access token using a refresh token (OAuth2 refresh grant)")
    public ResponseEntity<Map<String, Object>> refresh(@RequestBody Map<String, String> payload) {
        String refreshToken = payload.getOrDefault("refreshToken", "").trim();

        if (refreshToken.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "A refresh token is required"));
        }

        try {
            Map<String, Object> token = keycloakAuthService.refreshGrant(refreshToken);
            return ResponseEntity.ok(buildSession(
                    token, payload.getOrDefault("realm", "personal-library-realm"), "unknown"));
        } catch (KeycloakAuthService.InvalidCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * Assembles the client-facing session payload from a raw Keycloak token response.
     *
     * WHAT: Decodes the access token and combines tokens, expiry and the realm's view of the
     * identity into the single response shape both login and refresh return.
     *
     * WHY: Login and refresh must hand the client identical structures, because the client swaps
     * one for the other in place. Building that payload in two places invites them to drift — a
     * field added to login but forgotten in refresh would silently blank out after the first
     * renewal. One builder makes that class of bug impossible.
     *
     * @param token              Raw Keycloak token endpoint response.
     * @param realm              Realm name to echo back on the profile.
     * @param fallbackUsername   Username to use when the token carries no `preferred_username`.
     * @return Session payload with access token, refresh token, expiry and profile.
     */
    private Map<String, Object> buildSession(Map<String, Object> token, String realm, String fallbackUsername) {
        String accessToken = String.valueOf(token.get("access_token"));
        Map<String, Object> claims = keycloakAuthService.decodeClaims(accessToken);

        // Prefer the realm's own claims over anything the client submitted, so the returned
        // profile always reflects Keycloak's view of the identity rather than user input.
        String preferredUsername = String.valueOf(claims.getOrDefault("preferred_username", fallbackUsername));
        Map<String, Object> user = new HashMap<>();
        user.put("id", String.valueOf(claims.getOrDefault("sub", "usr-kc-" + preferredUsername.hashCode())));
        user.put("username", preferredUsername);
        user.put("email", String.valueOf(claims.getOrDefault("email", preferredUsername)));
        user.put("name", String.valueOf(claims.getOrDefault("name", preferredUsername)));
        user.put("roles", keycloakAuthService.realmRoles(claims));
        user.put("realm", realm);
        user.put("authenticatedAt", Instant.now().toString());

        Map<String, Object> response = new HashMap<>();
        response.put("accessToken", accessToken);
        response.put("refreshToken", token.get("refresh_token"));
        response.put("tokenType", "Bearer");
        response.put("expiresIn", token.getOrDefault("expires_in", 1800));
        response.put("user", user);
        return response;
    }

    /**
     * Invalidates the active Keycloak authentication session.
     *
     * WHAT: Revokes the supplied refresh token at the realm's end-session endpoint and confirms
     * termination to the client.
     *
     * WHY: Explicit logout endpoints let clients cleanly purge stored JWTs and prevent reuse of
     * lingering tokens on shared workstations. Clearing browser storage alone is no longer
     * sufficient now that the client holds a long-lived refresh token: that token stays valid at
     * the realm until it expires, so anything that captured it could keep minting access tokens
     * after the user signed out. Revoking it server-side closes that window.
     *
     * @param payload Optional map carrying the {@code refreshToken} to revoke.
     * @return Confirmation response.
     */
    @PostMapping("/logout")
    @Operation(summary = "Terminate Keycloak session and revoke the refresh token")
    public ResponseEntity<Map<String, Object>> logout(@RequestBody(required = false) Map<String, String> payload) {
        if (payload != null) {
            keycloakAuthService.revokeRefreshToken(payload.get("refreshToken"));
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Keycloak OIDC session terminated successfully."
        ));
    }
}
