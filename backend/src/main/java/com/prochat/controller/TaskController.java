package com.prochat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.prochat.model.Task;
import com.prochat.repository.TaskRepository;

@RestController
@RequestMapping("/tasks")
@CrossOrigin
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @GetMapping
    public List<Task> getTasks(@RequestParam(required = false) String mode) {
        if (mode != null && !mode.isEmpty() && !"ALL".equalsIgnoreCase(mode)) {
            return taskRepository.findByModeOrderByIdDesc(mode);
        }
        return taskRepository.findAllByOrderByIdDesc();
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        if (task.getStatus() == null || task.getStatus().isEmpty()) {
            task.setStatus("PENDING");
        }
        return taskRepository.save(task);
    }

    @PostMapping("/{id}/status")
    public Map<String, Object> updateTaskStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();
        Task task = taskRepository.findById(id).orElse(null);

        if (task != null) {
            String newStatus = payload.getOrDefault("status", "COMPLETED");
            task.setStatus(newStatus);
            taskRepository.save(task);

            response.put("success", true);
            response.put("task", task);
        } else {
            response.put("success", false);
            response.put("error", "Task not found");
        }
        return response;
    }
}
