package br.com.shiroshima.backend.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse.MiniTaskSummary;
import br.com.shiroshima.backend.dtos.UpdateMiniTaskRequest;
import br.com.shiroshima.backend.services.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/mini-tasks")
@RequiredArgsConstructor
public class MiniTaskController {

    private final TaskService taskService;

    @GetMapping
    public List<MiniTaskGroupResponse> listMiniTasks() {
        return taskService.listMiniTaskGroups();
    }

    @PatchMapping("/{id}")
    public MiniTaskSummary updateMiniTask(@PathVariable UUID id, @Valid @RequestBody UpdateMiniTaskRequest request) {
        return taskService.updateMiniTask(id, request);
    }

    /** Soft delete. With the last step, the MainTask goes too. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMiniTask(@PathVariable UUID id) {
        taskService.deleteMiniTask(id);
    }
}
