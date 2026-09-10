package com.prochat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.prochat.model.Admin;
import com.prochat.model.User;
import com.prochat.repository.AdminRepository;
import com.prochat.repository.MessageRepository;
import com.prochat.repository.UserRepository;

@RestController
@RequestMapping("/admin")
@CrossOrigin
public class AdminController {

    @Autowired
    private AdminRepository adminRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private MessageRepository messageRepo;

    // 🔐 LOGIN
    @PostMapping("/login")
    public String login(@RequestBody Admin req) {

        Admin admin = adminRepo.findByUsername(req.getUsername());

        if (admin != null && admin.getPassword().equals(req.getPassword())) {
            return "SUCCESS";
        }

        return "FAIL";
    }

    // 👥 USERS LIST
    @GetMapping("/users")
    public List<User> getUsers() {
        return userRepo.findAll();
    }

    // 📊 STATS
    @GetMapping("/stats")
    public Map<String, Long> stats() {

        Map<String, Long> map = new HashMap<>();

        map.put("totalUsers", userRepo.count());
        map.put("totalMessages", messageRepo.count());

        return map;
    }

    // 🚫 BLOCK USER
    @PostMapping("/block/{username}")
    public String blockUser(@PathVariable String username) {

        User user = userRepo.findByUsername(username);

        if (user != null) {
            user.setBlocked(true);
            userRepo.save(user);
            return "BLOCKED";
        }

        return "NOT FOUND";
    }

    @PostMapping("/unblock/{username}")
    public String unblockUser(@PathVariable String username) {

        User user = userRepo.findByUsername(username);

        if (user != null) {
            user.setBlocked(false);
            userRepo.save(user);
            return "User unblocked";
        }

        return "User not found";
    }
}