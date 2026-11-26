package br.com.shiroshima.backend.dtos;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Body of POST /main-tasks/{id}/mini-tasks: a new step at the end ("Novo passo", or a copy with "Copiar para"). */
public record CreateMiniTaskRequest(
        @NotBlank(message = "Informe o texto do passo.")
        String text,
        /** Null keeps the step in the task bank. */
        LocalDate scheduledDate,
        /** `HH:mm`. Only with scheduledDate. */
        @Pattern(regexp = UpdateMiniTaskRequest.TIME_PATTERN, message = UpdateMiniTaskRequest.TIME_MESSAGE)
        String scheduledTime) {
}
