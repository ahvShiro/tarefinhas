package br.com.shiroshima.backend.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.shiroshima.backend.dtos.CreateMainTaskRequest;
import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse;
import br.com.shiroshima.backend.services.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/main-tasks")
@RequiredArgsConstructor
public class MainTaskController {

    private final TaskService taskService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MiniTaskGroupResponse createMainTask(@Valid @RequestBody CreateMainTaskRequest request) {
        return taskService.createMainTask(request);
    }
}
