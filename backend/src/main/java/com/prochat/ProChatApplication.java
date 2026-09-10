package com.prochat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ProChatApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProChatApplication.class, args);
        System.out.println("ProChat Server Started on port 8081");
    }
}