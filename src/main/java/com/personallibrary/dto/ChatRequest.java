package com.personallibrary.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object containing a natural language question and conversation history
 * for the Retrieval-Augmented Generation (RAG) assistant.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    /**
     * User's natural language question regarding the document.
     */
    @NotBlank(message = "Question cannot be blank")
    private String question;

    /**
     * Optional conversation turns for contextual multi-turn dialogue.
     */
    private List<ChatMessageDto> chatHistory;

    /**
     * Historical conversation message item.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessageDto {
        /** Participant role ("user" or "assistant"). */
        private String role;
        /** Textual content of the dialogue turn. */
        private String text;
    }
}
