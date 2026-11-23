package br.com.shiroshima.backend.dtos;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import br.com.shiroshima.backend.models.MainTask;
import br.com.shiroshima.backend.models.MiniTask;

/** A MainTask with its miniTasks, as shown on the task list screen. */
public record MiniTaskGroupResponse(MainTaskSummary mainTask, List<MiniTaskSummary> miniTasks) {

    public record MainTaskSummary(UUID id, String name, String description, String color) {

        public static MainTaskSummary from(MainTask mainTask) {
            return new MainTaskSummary(
                    mainTask.getId(),
                    mainTask.getName(),
                    mainTask.getDescription(),
                    mainTask.getColor());
        }
    }

    public record MiniTaskSummary(
            UUID id,
            String text,
            int position,
            boolean done,
            LocalDate scheduledDate,
            /** `HH:00`, same format as the frontend. */
            String scheduledTime) {

        private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

        public static MiniTaskSummary from(MiniTask miniTask) {
            return new MiniTaskSummary(
                    miniTask.getId(),
                    miniTask.getText(),
                    miniTask.getPosition(),
                    miniTask.isDone(),
                    miniTask.getScheduledDate(),
                    miniTask.getScheduledTime() == null ? null : miniTask.getScheduledTime().format(TIME_FORMAT));
        }
    }
}
