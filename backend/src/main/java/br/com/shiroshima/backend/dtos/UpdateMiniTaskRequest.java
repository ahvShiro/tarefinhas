package br.com.shiroshima.backend.dtos;

import java.time.LocalDate;

import jakarta.validation.constraints.Pattern;

/**
 * Body of PATCH /mini-tasks/{id}. A missing (null) done or inProgress keeps the current value.
 * scheduledDate and scheduledTime are always applied, because null has a meaning there: null date puts the step
 * back in the task bank, null time leaves it in "Sem hora" of the day. Send both every time.
 */
public record UpdateMiniTaskRequest(
        Boolean done,
        Boolean inProgress,
        LocalDate scheduledDate,
        @Pattern(regexp = TIME_PATTERN, message = TIME_MESSAGE)
        String scheduledTime) {

    public static final String TIME_PATTERN = "^([01]\\d|2[0-3]):[0-5]\\d$";
    public static final String TIME_MESSAGE = "Use uma hora no formato HH:mm.";
}
