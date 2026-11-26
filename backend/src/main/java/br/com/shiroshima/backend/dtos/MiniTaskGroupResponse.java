package br.com.shiroshima.backend.dtos;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import br.com.shiroshima.backend.models.Effort;
import br.com.shiroshima.backend.models.MainTask;
import br.com.shiroshima.backend.models.MiniTask;

/** A MainTask with its miniTasks, as shown on the task list screen. */
public record MiniTaskGroupResponse(MainTaskSummary mainTask, List<MiniTaskSummary> miniTasks) {

    public record MainTaskSummary(
            UUID id,
            String name,
            String description,
            /** Null when the task has no deadline. With createdAt, it gives the deadline of the steps not done. */
            Integer deadlineDays,
            Effort effort,
            String color,
            Instant createdAt) {

        public static MainTaskSummary from(MainTask mainTask) {
            return new MainTaskSummary(
                    mainTask.getId(),
                    mainTask.getName(),
                    mainTask.getDescription(),
                    mainTask.getDeadlineDays(),
                    mainTask.getEffort(),
                    mainTask.getColor(),
                    mainTask.getCreatedAt());
        }
    }

    public record MiniTaskSummary(
            UUID id,
            String text,
            int position,
            boolean done,
            Instant doneAt,
            boolean inProgress,
            LocalDate scheduledDate,
            /** `HH:mm`, same format as the frontend: `HH:00` for the hour slot or an exact time. */
            String scheduledTime,
            Instant createdAt) {

        private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

        public static MiniTaskSummary from(MiniTask miniTask) {
            return new MiniTaskSummary(
                    miniTask.getId(),
                    miniTask.getText(),
                    miniTask.getPosition(),
                    miniTask.isDone(),
                    miniTask.getDoneAt(),
                    miniTask.isInProgress(),
                    miniTask.getScheduledDate(),
                    miniTask.getScheduledTime() == null ? null : miniTask.getScheduledTime().format(TIME_FORMAT),
                    miniTask.getCreatedAt());
        }
    }
}
