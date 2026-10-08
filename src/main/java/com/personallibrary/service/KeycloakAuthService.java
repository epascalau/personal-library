/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Exchanges end-user credentials for genuine Keycloak access tokens.
 *
 * WHAT: Performs the OAuth2 Resource Owner Password Credentials grant ("direct access grant")
 * against the realm's token endpoint and decodes the resulting JWT payload so the caller can
 * surface the authenticated identity and its realm roles.
 *
 * WHY: The previous login endpoint fabricated an opaque marker (`kc_jwt_<millis>`) and hardcoded
 * administrator roles, so every password was accepted and the returned credential could not be
 * validated by the resource server. Brokering the grant server-side fixes both problems at once
 * and is additionally *required* rather than merely preferable: the issued token carries the
 * issuer the backend is configured to trust (`http://keycloak:8080/...` inside Docker), which a
 * browser cannot reach. A direct browser-to-Keycloak call would mint a token stamped with the
 * published host address and be rejected with `401 invalid_token`.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-10-08
 */
@Slf4j
@Service
public class KeycloakAuthService {

    private final RestClient restClient = RestClient.create();

    private final String issuerUri;

    private final String clientId;

    private final String clientSecret;

    /**
     * Creates the service from the same configuration the resource server already uses.
     *
     * WHAT: Captures the realm issuer URI plus the confidential client credentials.
     * WHY: Deriving the token endpoint from `issuer-uri` guarantees tokens are always minted by the
     * exact realm whose signatures the resource server is configured to verify, eliminating the
     * issuer-mismatch class of failure.
     *
     * @param issuerUri    Realm issuer URI, e.g. {@code http://keycloak:8080/realms/personal-library-realm}.
     * @param clientId     Confidential client identifier.
     * @param clientSecret Confidential client secret.
     */
    public KeycloakAuthService(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri,
            @Value("${KEYCLOAK_CLIENT_ID:personal-library-client}") String clientId,
            @Value("${KEYCLOAK_CLIENT_SECRET:enterprise-library-secret}") String clientSecret) {
        this.issuerUri = issuerUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    /**
     * Authenticates a user against the Keycloak realm and returns the raw token response.
     *
     * WHAT: Posts a `password` grant to the realm token endpoint and returns Keycloak's JSON body
     * (access token, refresh token, expiry) verbatim.
     * WHY: Returning the untouched response keeps this method a faithful pass-through, so callers
     * can expose `expires_in` and `refresh_token` without this class having to model them.
     *
     * @param username Realm username or email address.
     * @param password Plaintext password supplied by the user.
     * @return Keycloak token response.
     * @throws InvalidCredentialsException When the realm rejects the credentials.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> passwordGrant(String username, String password) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("grant_type", "password");
        form.add("username", username);
        form.add("password", password);

        try {
            Map<String, Object> body = restClient.post()
                    .uri(issuerUri + "/protocol/openid-connect/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            if (body == null || body.get("access_token") == null) {
                throw new InvalidCredentialsException("Keycloak returned no access token");
            }
            return body;
        } catch (RestClientResponseException ex) {
            // Keycloak answers 401 with {"error":"invalid_grant"} for both a bad password and a
            // disabled account; it deliberately does not distinguish them, and neither do we.
            log.warn("Keycloak rejected authentication for '{}': {}", username, ex.getStatusCode());
            throw new InvalidCredentialsException("Invalid username or password");
        }
    }

    /**
     * Decodes the unverified payload of a JWT issued moments earlier by this service.
     *
     * WHAT: Base64url-decodes the second segment and parses its claims.
     * WHY: The token was just obtained over a trusted server-to-server call from the realm itself,
     * so re-verifying the signature here would add no security. Signature verification still happens
     * on every subsequent API call, where the token arrives from an untrusted client.
     *
     * @param accessToken Compact-serialized JWT.
     * @return Decoded claim set, or an empty map when the token is not a readable JWT.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> decodeClaims(String accessToken) {
        try {
            String[] segments = accessToken.split("\\.");
            if (segments.length != 3) {
                return Collections.emptyMap();
            }
            byte[] payload = Base64.getUrlDecoder().decode(segments[1]);
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, Map.class);
        } catch (Exception ex) {
            log.warn("Unable to decode access token payload: {}", ex.getMessage());
            return Collections.emptyMap();
        }
    }

    /**
     * Extracts realm role names from decoded token claims.
     *
     * WHAT: Reads the nested {@code realm_access.roles} array.
     * WHY: Keycloak nests realm roles rather than exposing them as a top-level claim, and the
     * frontend profile card renders exactly this list.
     *
     * @param claims Decoded JWT claims.
     * @return Role names, or an empty list when the claim is absent.
     */
    @SuppressWarnings("unchecked")
    public List<String> realmRoles(Map<String, Object> claims) {
        Object realmAccess = claims.get("realm_access");
        if (realmAccess instanceof Map<?, ?> map && map.get("roles") instanceof List<?> roles) {
            return roles.stream().map(String::valueOf).toList();
        }
        return Collections.emptyList();
    }

    /**
     * Signals that the realm refused the supplied credentials.
     */
    public static class InvalidCredentialsException extends RuntimeException {
        /**
         * Creates the exception.
         *
         * @param message Human-readable reason safe to return to the client.
         */
        public InvalidCredentialsException(String message) {
            super(message);
        }
    }
}
