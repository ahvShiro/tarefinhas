package br.com.shiroshima.backend.services;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.shiroshima.backend.dtos.CreateMainTaskRequest;
import br.com.shiroshima.backend.dtos.CreateMiniTaskRequest;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse.MainTaskSummary;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse.MiniTaskSummary;
import br.com.shiroshima.backend.dtos.UpdateMiniTaskRequest;
import br.com.shiroshima.backend.exceptions.BusinessException;
import br.com.shiroshima.backend.exceptions.NotFoundException;
import br.com.shiroshima.backend.models.ColorPalette;
import br.com.shiroshima.backend.models.Effort;
import br.com.shiroshima.backend.models.MainTask;
import br.com.shiroshima.backend.models.MiniTask;
import br.com.shiroshima.backend.models.User;
import br.com.shiroshima.backend.repositories.MainTaskRepository;
import br.com.shiroshima.backend.repositories.MiniTaskRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskService {

    private final MainTaskRepository mainTaskRepository;
    private final MiniTaskRepository miniTaskRepository;
    private final UserService userService;

    /** The signed-in user's miniTasks grouped by MainTask. Keeps the query order (oldest MainTask first, steps in order). */
    public List<MiniTaskGroupResponse> listMiniTaskGroups() {
        Map<MainTask, List<MiniTaskSummary>> groups = new LinkedHashMap<>();
        User user = userService.fetchAuthenticatedUser();
        for (MiniTask miniTask : miniTaskRepository.findAllWithMainTaskByUser(user)) {
            groups.computeIfAbsent(miniTask.getMainTask(), mainTask -> new ArrayList<>())
                    .add(MiniTaskSummary.from(miniTask));
        }
        return groups.entrySet().stream()
                .map(group -> new MiniTaskGroupResponse(MainTaskSummary.from(group.getKey()), group.getValue()))
                .toList();
    }

    /** Saves the MainTask and one MiniTask per form step, in a single transaction. */
    @Transactional
    public MiniTaskGroupResponse createMainTask(CreateMainTaskRequest request) {
        Instant now = Instant.now();

        MainTask mainTask = new MainTask();
        mainTask.setUser(userService.fetchAuthenticatedUser());
        mainTask.setName(request.name().trim());
        mainTask.setDescription(request.description().trim());
        mainTask.setDeadlineDays(request.deadlineDays());
        mainTask.setEffort(request.effort() == null ? Effort.DEFAULT : request.effort());
        mainTask.setColor(ColorPalette.pickRandomColor());
        mainTask.setCreatedAt(now);
        mainTaskRepository.save(mainTask);

        List<MiniTask> miniTasks = new ArrayList<>();
        for (int index = 0; index < request.miniTasks().size(); index++) {
            MiniTask miniTask = new MiniTask();
            miniTask.setMainTask(mainTask);
            miniTask.setText(request.miniTasks().get(index).text().trim());
            miniTask.setPosition(index + 1);
            miniTask.setCreatedAt(now);
            miniTasks.add(miniTask);
        }
        miniTaskRepository.saveAll(miniTasks);

        return new MiniTaskGroupResponse(
                MainTaskSummary.from(mainTask),
                miniTasks.stream().map(MiniTaskSummary::from).toList());
    }

    /** A new step at the end of the MainTask, not done. In the task bank, or on a day when scheduledDate is set. */
    @Transactional
    public MiniTaskSummary createMiniTask(UUID mainTaskId, CreateMiniTaskRequest request) {
        MainTask mainTask = mainTaskRepository.findByIdAndUser(mainTaskId, userService.fetchAuthenticatedUser())
                .orElseThrow(() -> new NotFoundException("Tarefa não encontrada."));

        MiniTask miniTask = new MiniTask();
        miniTask.setMainTask(mainTask);
        miniTask.setText(request.text().trim());
        miniTask.setPosition(miniTaskRepository.findMaxPosition(mainTask) + 1);
        applySchedule(miniTask, request.scheduledDate(), request.scheduledTime());
        miniTask.setCreatedAt(Instant.now());
        return MiniTaskSummary.from(miniTaskRepository.save(miniTask));
    }

    /** Checks as done, starts, schedules or moves back to the bank. See UpdateMiniTaskRequest for missing fields. */
    @Transactional
    public MiniTaskSummary updateMiniTask(UUID miniTaskId, UpdateMiniTaskRequest request) {
        MiniTask miniTask = fetchOwnMiniTask(miniTaskId);
        if (request.done() != null && request.done() != miniTask.isDone()) {
            miniTask.setDone(request.done());
            miniTask.setDoneAt(request.done() ? Instant.now() : null);
        }
        if (request.inProgress() != null) miniTask.setInProgress(request.inProgress());
        applySchedule(miniTask, request.scheduledDate(), request.scheduledTime());
        return MiniTaskSummary.from(miniTask);
    }

    /** Soft delete. A MainTask needs at least 1 step: deleting its last step deletes the MainTask too. */
    @Transactional
    public void deleteMiniTask(UUID miniTaskId) {
        MiniTask miniTask = fetchOwnMiniTask(miniTaskId);
        MainTask mainTask = miniTask.getMainTask();
        boolean isLastStep = miniTaskRepository.countByMainTask(mainTask) == 1;
        Instant now = Instant.now();
        miniTask.setDeletedAt(now);
        if (isLastStep) mainTask.setDeletedAt(now);
    }

    private MiniTask fetchOwnMiniTask(UUID miniTaskId) {
        return miniTaskRepository.findByIdAndUser(miniTaskId, userService.fetchAuthenticatedUser())
                .orElseThrow(() -> new NotFoundException("Passo não encontrado."));
    }

    private static void applySchedule(MiniTask miniTask, LocalDate date, String time) {
        if (date == null && time != null) {
            throw new BusinessException("scheduledTime", "Escolha o dia antes da hora.");
        }
        miniTask.setScheduledDate(date);
        miniTask.setScheduledTime(time == null ? null : LocalTime.parse(time));
    }
}
