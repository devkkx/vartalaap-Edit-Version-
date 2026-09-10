package com.prochat.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class OtpService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    private static class OtpEntry {
        String otp;
        LocalDateTime expiryTime;
        boolean verified;

        OtpEntry(String otp, LocalDateTime expiryTime) {
            this.otp = otp;
            this.expiryTime = expiryTime;
            this.verified = false;
        }
    }

    private final Map<String, OtpEntry> otpCache = new ConcurrentHashMap<>();

    public Map<String, Object> sendOtp(String email) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || email.trim().isEmpty()) {
            response.put("success", false);
            response.put("error", "Please enter your email address.");
            return response;
        }

        email = email.trim().toLowerCase();

        // Generate 6-digit random OTP
        String otp = String.format("%06d", new Random().nextInt(1000000));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        otpCache.put(email, new OtpEntry(otp, expiry));

        System.out.println("==================================================");
        System.out.println("📧 Sending REAL Email OTP to [" + email + "]...");
        System.out.println("==================================================");

        if (mailSender == null) {
            response.put("success", false);
            response.put("error", "SMTP Mail service is not configured. Please set spring.mail.username and spring.mail.password in application.properties.");
            return response;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isEmpty() && !mailFrom.contains("your-email")) {
                message.setFrom(mailFrom);
            }
            message.setTo(email);
            message.setSubject("VartAlaap Email Verification OTP");
            message.setText("Hello,\n\nYour 6-digit email verification OTP for VartAlaap is: " + otp + "\n\nThis OTP will expire in 10 minutes.\nIf you did not request this, please ignore this email.\n\nRegards,\nVartAlaap Security Team");

            mailSender.send(message);
            System.out.println("✅ REAL Email delivered successfully to: " + email);

            response.put("success", true);
            response.put("message", "OTP sent to your email (" + email + "). Please check your inbox / spam folder.");
            return response;
        } catch (Exception e) {
            System.err.println("❌ SMTP Delivery Error: " + e.getMessage());
            response.put("success", false);
            response.put("error", "Failed to send email: " + e.getMessage() + ". Please configure your Gmail address and App Password in application.properties.");
            return response;
        }
    }

    public Map<String, Object> verifyOtp(String email, String otp) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || otp == null) {
            response.put("success", false);
            response.put("error", "Email and OTP are required.");
            return response;
        }

        email = email.trim().toLowerCase();
        otp = otp.trim();

        OtpEntry entry = otpCache.get(email);
        if (entry == null) {
            response.put("success", false);
            response.put("error", "No active OTP found for this email. Please click 'Send OTP' first.");
            return response;
        }

        if (LocalDateTime.now().isAfter(entry.expiryTime)) {
            otpCache.remove(email);
            response.put("success", false);
            response.put("error", "OTP has expired. Please request a new OTP.");
            return response;
        }

        if (!entry.otp.equals(otp)) {
            response.put("success", false);
            response.put("error", "Invalid OTP. Please check your email inbox and try again.");
            return response;
        }

        entry.verified = true;
        response.put("success", true);
        response.put("message", "Email verified successfully! You can now create your password.");
        return response;
    }

    public boolean isEmailVerified(String email) {
        if (email == null) return false;
        OtpEntry entry = otpCache.get(email.trim().toLowerCase());
        return entry != null && entry.verified;
    }

    public void clearOtp(String email) {
        if (email != null) {
            otpCache.remove(email.trim().toLowerCase());
        }
    }
}
