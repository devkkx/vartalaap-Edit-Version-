package com.prochat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.prochat.model.Admin;
import com.prochat.model.LoginRequest;
import com.prochat.model.User;
import com.prochat.repository.AdminRepository;
import com.prochat.repository.UserRepository;

@RestController
public class LoginController {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public String login(@RequestBody LoginRequest request) {

        // ADMIN CHECK FIRST
        Admin admin = adminRepository.findByUsername(request.getUsername());

        if (admin != null &&
            admin.getPassword().equals(request.getPassword())) {

            return "ADMIN";
        }

        // NORMAL USER CHECK
        User user = userRepository.findByUsername(request.getUsername());

        if (user != null &&
            user.getPassword().equals(request.getPassword())) {

            if (user.isBlocked()) {
                return "BLOCKED";
            }

            return "USER";
        }

        return "INVALID";
    }
}