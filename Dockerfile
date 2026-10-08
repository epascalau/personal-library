# ==============================================================================
# Multi-stage Dockerfile for Personal Library Enterprise Application
# Compiles both Java Spring Boot (Spring AI) and Vite Frontend with Enterprise SSL
# ==============================================================================

# Stage 0: Normalises whatever the user dropped into ./certs into a single
# bundle, so later stages never have to care about the certificate file names.
# The directory always exists (certs/.gitkeep), so the COPY can never fail.
# No package installs here: this stage runs before anything is trusted, so it
# must get by with the shell utilities already present in the base image.
FROM alpine:3.20 AS enterprise-certs
COPY certs/ /tmp/certs/
RUN mkdir -p /out /bundle \
    && : > /bundle/enterprise-ca-bundle.pem \
    && for cert in /tmp/certs/*.crt /tmp/certs/*.pem; do \
         [ -f "$cert" ] || continue; \
         cp "$cert" "/out/$(basename "${cert%.*}").crt"; \
         cat "$cert" >> /bundle/enterprise-ca-bundle.pem; \
         echo >> /bundle/enterprise-ca-bundle.pem; \
       done \
    && echo "Enterprise certificates staged:" && ls -1 /out

# Stage 1: Build the UI5 / Vite Frontend
FROM node:24.21.0-alpine AS frontend-builder
WORKDIR /app

# npm must trust the corporate TLS-intercepting proxy to reach the registry.
# Node merges NODE_EXTRA_CA_CERTS with its built-in roots, so no OS-level
# trust store rebuild (unavailable on Alpine) is required here.
COPY --from=enterprise-certs /bundle/enterprise-ca-bundle.pem /etc/ssl/enterprise-ca-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/enterprise-ca-bundle.pem

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Bake a source snapshot into the image. The runtime stage deliberately carries
# no project sources (only the built artifacts), so the /export.zip endpoint has
# nothing to archive there — it previously failed with a 500. This stage is the
# only one holding the full tree, so the archive is produced here and shipped as
# a static asset. It excludes certs/, storage/ and dotenv secrets; see
# scripts/export-zip.ts.
RUN node ./node_modules/tsx/dist/cli.mjs scripts/export-zip.ts /tmp/project-source.zip

FROM node:24.21.0-bookworm-slim AS node-runtime

# Stage 2: Build the Java Spring Boot Backend (Maven + Java 21)
FROM maven:3.9.8-eclipse-temurin-21 AS backend-builder
WORKDIR /app

# Maven resolves dependencies over HTTPS, so the corporate CA has to be trusted
# by both the OS bundle and the JDK truststore before the first download.
COPY --from=enterprise-certs /out/ /usr/local/share/ca-certificates/
RUN update-ca-certificates \
    && for cert in /usr/local/share/ca-certificates/*.crt; do \
         [ -f "$cert" ] || continue; \
         keytool -importcert -noprompt \
             -alias "enterprise-$(basename "$cert" .crt)" \
             -keystore "$JAVA_HOME/lib/security/cacerts" \
             -storepass changeit \
             -file "$cert" || true; \
       done

COPY pom.xml ./
COPY src/main/java ./src/main/java
COPY src/main/resources ./src/main/resources
# Cache the local Maven repository across builds (BuildKit cache mount) so that
# transient Maven Central network blips only require re-fetching whatever
# wasn't already resolved by a previous build, instead of the entire dependency
# graph every time.
RUN --mount=type=cache,target=/root/.m2 mvn clean package -DskipTests

# Stage 3: Java 21 & Node.js Production Runtime
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

COPY --from=node-runtime /usr/local/ /usr/local/

RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Install every enterprise root/intermediate CA into the OS bundle and the JDK
# truststore, so both Node.js and Spring Boot trust the corporate proxy.
COPY --from=enterprise-certs /out/ /usr/local/share/ca-certificates/
RUN update-ca-certificates \
    && for cert in /usr/local/share/ca-certificates/*.crt; do \
         [ -f "$cert" ] || continue; \
         echo "Registering $(basename "$cert") into the JDK truststore..."; \
         keytool -importcert -noprompt \
             -alias "enterprise-$(basename "$cert" .crt)" \
             -keystore "$JAVA_HOME/lib/security/cacerts" \
             -storepass changeit \
             -file "$cert" || true; \
       done

# Node.js maintains its own bundle and ignores the OS trust store.
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Create physical asset storage directory
RUN mkdir -p /app/storage/documents

COPY package*.json ./
RUN npm ci --omit=dev

# Copy Frontend artifacts
COPY --from=frontend-builder /app/dist ./dist
# Keep the repository license available to the runtime license endpoint.
COPY LICENSE ./LICENSE

# Copy Spring Boot Backend JAR
COPY --from=backend-builder /app/target/*.jar ./app.jar

COPY src/main/server ./src/main/server
COPY tsconfig.json ./
COPY openapi.yaml ./
# Static assets streamed by the gateway: the architecture/mindmap diagram set
# (/api/v1/diagrams/*), the presentation decks, and the BPMN 2.0 process model
# (/api/v1/bpmn/*). Without these the routes resolve but 404 on the filesystem.
COPY docs ./docs
COPY src/main/resources/bpmn ./src/main/resources/bpmn
COPY docker-entrypoint.sh ./

# Source snapshot served by /export.zip (built in the frontend-builder stage).
COPY --from=frontend-builder /tmp/project-source.zip ./project-source.zip
RUN chmod +x docker-entrypoint.sh

# Expose HTTP ports (UI/Gateway: 13000, Spring Boot: 18080)
EXPOSE 13000 18080

ENV NODE_ENV=production
ENV PORT=13000

CMD ["./docker-entrypoint.sh"]
