package br.com.shiroshima.backend.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.shiroshima.backend.dtos.CreateMainTaskRequest;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse.MainTaskSummary;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse.MiniTaskSummary;
import br.com.shiroshima.backend.models.ColorPalette;
import br.com.shiroshima.backend.models.MainTask;
import br.com.shiroshima.backend.models.MiniTask;
import br.com.shiroshima.backend.repositories.MainTaskRepository;
import br.com.shiroshima.backend.repositories.MiniTaskRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskService {

    private final MainTaskRepository mainTaskRepository;
    private final MiniTaskRepository miniTaskRepository;

    /** All miniTasks grouped by MainTask. Keeps the query order (oldest MainTask first, steps in order). */
    public List<MiniTaskGroupResponse> listMiniTaskGroups() {
        Map<MainTask, List<MiniTaskSummary>> groups = new LinkedHashMap<>();
        for (MiniTask miniTask : miniTaskRepository.findAllWithMainTask()) {
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
        mainTask.setName(request.name().trim());
        mainTask.setDescription(request.description().trim());
        mainTask.setDeadlineDays(request.deadlineDays());
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
}
