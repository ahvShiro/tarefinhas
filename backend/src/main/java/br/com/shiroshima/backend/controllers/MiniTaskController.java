package br.com.shiroshima.backend.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.shiroshima.backend.dtos.MiniTaskGroupResponse;
import br.com.shiroshima.backend.services.TaskService;
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
}
