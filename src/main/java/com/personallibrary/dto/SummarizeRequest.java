package com.personallibrary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for re-computing an AI executive or analytical summary
 * for an existing document using a designated Spring AI Ollama model.
 *
 * @author Enterprise Architecture Team
 * @version 1.0.0
 * @since 2026-09-30
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SummarizeRequest {

    /**
     * Target AI model identifier ("llama" for analytical synthesis or "mistral" for executive summary).
     */
    @NotBlank(message = "Model name is required")
    @Pattern(regexp = "^(llama|mistral)$", message = "Model must be either 'llama' or 'mistral'")
    private String model;
}
