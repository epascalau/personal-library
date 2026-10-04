/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
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

        /**
         * Factory method to create a user-role chat message.
         *
         * WHAT: Instantiates ChatMessageDto with "user" role and specified message text.
         * WHY: Simplifies constructing conversational dialogue turns in unit tests and RAG controllers.
         *
         * @param text Prompt or question text.
         * @return ChatMessageDto instance representing user turn.
         */
        public static ChatMessageDto user(String text) {
            return new ChatMessageDto("user", text);
        }

        /**
         * Factory method to create an assistant-role chat message.
         *
         * WHAT: Instantiates ChatMessageDto with "assistant" role and answer text.
         * WHY: Facilitates feeding prior RAG responses back into multi-turn dialogue context windows.
         *
         * @param text Model generated answer text.
         * @return ChatMessageDto instance representing assistant turn.
         */
        public static ChatMessageDto assistant(String text) {
            return new ChatMessageDto("assistant", text);
        }
    }
}

