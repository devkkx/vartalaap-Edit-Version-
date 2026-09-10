package com.prochat.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.prochat.model.User;
import com.prochat.service.OtpService;
import com.prochat.service.UserService;

@RestController
@RequestMapping("/auth")
@CrossOrigin
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private OtpService otpService;

    @PostMapping("/send-otp")
    public Map<String, Object> sendOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        return otpService.sendOtp(email);
    }

    @PostMapping("/verify-otp")
    public Map<String, Object> verifyOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        return otpService.verifyOtp(email, otp);
    }

    @PostMapping("/register")
    public String register(@RequestBody User user) {
        System.out.println("REGISTER API HIT: " + user.getUsername() + " (" + user.getEmail() + ")");

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            if (!otpService.isEmailVerified(user.getEmail())) {
                return "Please verify your email address with OTP before creating your password.";
            }
        }

        if (user.getPassword() == null || user.getPassword().length() < 6 || user.getPassword().length() > 32) {
            return "Password length must be between 6 and 32 characters.";
        }

        boolean success = userService.register(user.getUsername(), user.getEmail(), user.getPassword());

        if (success) {
            if (user.getEmail() != null) {
                otpService.clearOtp(user.getEmail());
            }
            return "Registration successful";
        } else {
            return "User or Email already exists";
        }
    }

    @PostMapping("/login")
    public String login(@RequestBody User user) {
        boolean valid = userService.login(user.getUsername(), user.getPassword());

        if (valid)
            return "Login success";
        else
            return "Invalid credentials";
    }
}
