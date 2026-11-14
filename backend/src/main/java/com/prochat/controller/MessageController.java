package com.prochat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.prochat.handler.ChatHandler;
import com.prochat.model.Message;
import com.prochat.repository.MessageRepository;

@RestController
@CrossOrigin
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @GetMapping("/messages")
    public List<Message> getMessages() {
        return messageRepository.findAllByOrderByIdAsc();
    }

    // ================= EDIT MESSAGE =================
    @PutMapping("/messages/{id}")
    public Map<String, Object> editMessage(@PathVariable int id, @RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        String newContent = body.get("content");
        String requestingUser = body.get("sender");

        Message msg = messageRepository.findById(id).orElse(null);
        if (msg == null) {
            response.put("success", false);
            response.put("error", "Message not found");
            return response;
        }

        if (requestingUser != null && !requestingUser.equalsIgnoreCase(msg.getSender())) {
            response.put("success", false);
            response.put("error", "Unauthorized to edit this message");
            return response;
        }

        msg.setContent(newContent);
        msg.setEdited(true);
        messageRepository.save(msg);

        // Notify WebSockets
        ChatHandler.broadcastStatic("EDIT|" + id + "|" + newContent);

        response.put("success", true);
        response.put("message", msg);
        return response;
    }

    // ================= DELETE MESSAGE =================
    @DeleteMapping("/messages/{id}")
    public Map<String, Object> deleteMessage(@PathVariable int id, @RequestParam(value = "sender", required = false) String requestingUser) {
        Map<String, Object> response = new HashMap<>();

        Message msg = messageRepository.findById(id).orElse(null);
        if (msg == null) {
            response.put("success", false);
            response.put("error", "Message not found");
            return response;
        }

        if (requestingUser != null && !requestingUser.equalsIgnoreCase(msg.getSender())) {
            response.put("success", false);
            response.put("error", "Unauthorized to delete this message");
            return response;
        }

        messageRepository.deleteById(id);

        // Notify WebSockets
        ChatHandler.broadcastStatic("DELETE|" + id);

        response.put("success", true);
        return response;
    }
}