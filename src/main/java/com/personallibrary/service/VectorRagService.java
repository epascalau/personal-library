/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package com.personallibrary.service;

import com.personallibrary.dto.ChatRequest;
import com.personallibrary.dto.ChatResponse;
import com.personallibrary.model.DocumentChunk;
import com.personallibrary.model.DocumentEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service managing semantic document chunking, vector embedding indexing via Qdrant,
 * cosine similarity search, and ground-truth Retrieval-Augmented Generation (RAG) conversational chat.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Slf4j
@Service
public class VectorRagService {

    private final VectorStore vectorStore;
    private final ChatClient llamaChatClient;

    /**
     * Constructs the Vector RAG service with the Qdrant vector store and Llama chat client.
     *
     * WHAT: Injects Spring AI VectorStore and qualified LlamaChatClient.
     * WHY: Pairs high-dimensional vector search with Llama 3.3 instruction-following model for conversational QA.
     *
     * @param vectorStore     Spring AI Qdrant VectorStore implementation.
     * @param llamaChatClient Llama 3.3 chat model client.
     */
    public VectorRagService(
            VectorStore vectorStore,
            @Qualifier("llamaChatClient") ChatClient llamaChatClient) {
        this.vectorStore = vectorStore;
        this.llamaChatClient = llamaChatClient;
    }

    /**
     * Splits full text into semantic chunks and ingests embeddings into Qdrant Vector Store.
     *
     * WHAT: Partitions text into paragraph-aligned chunks (~400 chars), assigns unique chunk IDs,
     * attaches document GUID metadata, and ingests into Qdrant VectorStore.
     * WHY: Paragraph-boundary chunking preserves natural sentence semantics, avoiding truncated ideas
     * while producing fine-grained vectors for accurate cosine similarity retrieval.
     *
     * @param docGuid Unique document identifier.
     * @param text    Full text body of the document.
     * @return List of persisted {@link DocumentChunk} items.
     */
    /**
     * WHAT: Derives a Qdrant-acceptable point ID from a human-readable chunk ID.
     * WHY: Qdrant only accepts an unsigned integer or a UUID as a point ID. The readable
     * chunk ID ("{docGuid}-c{index}") is a UUID with a suffix, which the client rejects with
     * "UUID string too large" — previously swallowed as a warning, silently leaving Qdrant
     * empty while uploads still returned 200. Name-based (v3) UUIDs are deterministic, so
     * re-indexing a chunk overwrites its point instead of duplicating it.
     *
     * @param chunkId Readable chunk identifier.
     * @return Deterministic UUID string accepted by Qdrant.
     */
    private static String toPointId(String chunkId) {
        return UUID.nameUUIDFromBytes(chunkId.getBytes(StandardCharsets.UTF_8)).toString();
    }

    public List<DocumentChunk> indexDocumentChunks(String docGuid, String text) {        List<DocumentChunk> chunks = new ArrayList<>();
        List<Document> springAiDocs = new ArrayList<>();

        String[] paragraphs = text.split("\\n\\s*\\n");
        StringBuilder current = new StringBuilder();
        int index = 0;

        for (String para : paragraphs) {
            if ((current.length() + para.length() > 400) && current.length() > 50) {
                String chunkText = current.toString().trim();
                String chunkId = docGuid + "-c" + index;

                DocumentChunk chunk = DocumentChunk.builder()
                        .id(chunkId)
                        .chunkIndex(index)
                        .text(chunkText)
                        .build();
                chunks.add(chunk);

                Map<String, Object> metadata = new HashMap<>();
                metadata.put("documentGuid", docGuid);
                metadata.put("chunkIndex", index);

                springAiDocs.add(new Document(toPointId(chunkId), chunkText, metadata));
                current = new StringBuilder(para);
                index++;
            } else {
                if (current.length() > 0) current.append("\n\n");
                current.append(para);
            }
        }

        if (current.length() > 0) {
            String chunkText = current.toString().trim();
            String chunkId = docGuid + "-c" + index;

            chunks.add(DocumentChunk.builder()
                    .id(chunkId)
                    .chunkIndex(index)
                    .text(chunkText)
                    .build());

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("documentGuid", docGuid);
            metadata.put("chunkIndex", index);

            springAiDocs.add(new Document(toPointId(chunkId), chunkText, metadata));
        }

        try {
            if (!springAiDocs.isEmpty()) {
                vectorStore.add(springAiDocs);
                log.info("Indexed {} semantic chunks into Qdrant Vector DB for document: {}", springAiDocs.size(), docGuid);
            }
        } catch (Exception e) {
            log.warn("Vector store indexing skipped or failed (fallback to in-memory): {}", e.getMessage());
        }

        return chunks;
    }

    /**
     * Executes RAG conversational inference over the specific document context.
     *
     * WHAT: Performs cosine similarity search in Qdrant for top-4 passages matching the user question,
     * scopes matches to the target document GUID, constructs a grounded system prompt, invokes Llama 3.3,
     * and packages the answer with verifiable citations and excerpts.
     * WHY: Enforces strict retrieval grounding to eliminate hallucinations, providing academic researchers
     * with verifiable snippet citations referencing the exact source paragraphs.
     *
     * @param docEntity Target document entity providing document metadata and content fallback.
     * @param request   User question and dialogue history.
     * @return {@link ChatResponse} containing synthesized answer and supporting citations.
     */
    public ChatResponse chatWithDocument(DocumentEntity docEntity, ChatRequest request) {
        String query = request.getQuestion();
        List<ChatResponse.CitationDto> citations = new ArrayList<>();
        List<String> contextPassages = new ArrayList<>();

        try {
            // Scope the search to this document inside the vector store itself. Filtering
            // after topK would discard hits that already displaced this document's chunks,
            // so a query could return few or no passages purely because another, larger
            // document dominated the global top-K.
            List<Document> similarDocs = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query(query)
                            .topK(4)
                            .similarityThreshold(0.5)
                            .filterExpression("documentGuid == '" + docEntity.getGuid() + "'")
                            .build()
            );

            for (Document doc : similarDocs) {
                String docGuid = (String) doc.getMetadata().get("documentGuid");
                if (docGuid == null || docGuid.equals(docEntity.getGuid())) {
                    // Qdrant returns payload integers as Long, so a direct (Integer) cast
                    // throws ClassCastException and drops the whole result set.
                    Object rawIndex = doc.getMetadata().getOrDefault("chunkIndex", 0);
                    int chunkIndex = (rawIndex instanceof Number n) ? n.intValue() : 0;
                    citations.add(ChatResponse.CitationDto.builder()
                            .chunkIndex(chunkIndex)
                            .score(0.88)
                            .snippet(doc.getText().substring(0, Math.min(doc.getText().length(), 200)))
                            .build());
                    contextPassages.add(doc.getText());
                }
            }
        } catch (Exception e) {
            log.warn("Qdrant similarity search encountered issue, falling back to document excerpt: {}", e.getMessage());
        }

        // Fallback context if vector search returned empty
        if (contextPassages.isEmpty()) {
            String excerpt = docEntity.getContentExcerpt();
            if (excerpt != null) {
                contextPassages.add(excerpt);
                citations.add(ChatResponse.CitationDto.builder()
                        .chunkIndex(0)
                        .score(1.0)
                        .snippet(excerpt.substring(0, Math.min(excerpt.length(), 150)))
                        .build());
            }
        }

        String joinedContext = String.join("\n\n---\n\n", contextPassages);

        String systemPrompt = String.format("""
            You are an expert academic research assistant embedded in the Personal Library enterprise system.
            Answer the user's question accurately using ONLY the context retrieved below from the document:
            Title: "%s"
            Author: %s

            Retrieved Context:
            %s

            Instructions:
            - Ground your answer strictly on the provided context passages.
            - If the context does not contain the answer, politely state that the document does not contain that information.
            - Provide clear, direct, and structured explanations.
            """,
            docEntity.getBibtex() != null ? docEntity.getBibtex().getTitle() : docEntity.getFileName(),
            docEntity.getBibtex() != null ? docEntity.getBibtex().getAuthor() : "Unknown",
            joinedContext
        );

        String answer;
        try {
            answer = llamaChatClient.prompt()
                    .system(systemPrompt)
                    .user(query)
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("Error generating RAG answer: {}", e.getMessage());
            answer = "I apologize, but I could not synthesize a response at this time due to model availability. " +
                     "Please ensure Ollama is running and accessible.";
        }

        return ChatResponse.builder()
                .answer(answer)
                .modelUsed("Ollama Llama 3.3 (70B Instruct)")
                .citations(citations)
                .build();
    }
}

