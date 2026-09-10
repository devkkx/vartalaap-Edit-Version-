package com.prochat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.prochat.model.Reminder;
import com.prochat.repository.ReminderRepository;

@RestController
@RequestMapping("/reminders")
@CrossOrigin
public class ReminderController {

    @Autowired
    private ReminderRepository reminderRepository;

    @GetMapping
    public List<Reminder> getReminders() {
        return reminderRepository.findByStatusOrderByIdDesc("ACTIVE");
    }

    @PostMapping
    public Reminder createReminder(@RequestBody Reminder reminder) {
        if (reminder.getStatus() == null || reminder.getStatus().isEmpty()) {
            reminder.setStatus("ACTIVE");
        }
        return reminderRepository.save(reminder);
    }

    @PostMapping("/{id}/dismiss")
    public Map<String, Object> dismissReminder(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        Reminder reminder = reminderRepository.findById(id).orElse(null);

        if (reminder != null) {
            reminder.setStatus("DISMISSED");
            reminderRepository.save(reminder);
            response.put("success", true);
        } else {
            response.put("success", false);
            response.put("error", "Reminder not found");
        }
        return response;
    }
}
