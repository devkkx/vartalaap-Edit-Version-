package com.prochat.service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private DataSource dataSource;

    // REGISTER (Direct Plain Text Password as entered by user)
    public boolean register(String username, String email, String password) {
        try (Connection conn = dataSource.getConnection()) {
            // Ensure email column exists in table
            try {
                conn.createStatement().execute("ALTER TABLE users ADD COLUMN email VARCHAR(255)");
            } catch (Exception ignored) {
                // Column likely already exists
            }

            // STEP 1 → Check if user or email already exists
            String checkSql = "SELECT * FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)";
            PreparedStatement checkPs = conn.prepareStatement(checkSql);
            checkPs.setString(1, username);
            checkPs.setString(2, email != null ? email.trim().toLowerCase() : "");

            ResultSet rs = checkPs.executeQuery();

            if (rs.next()) {
                return false; // user or email already exists
            }

            // STEP 2 → Insert new user with exact password as entered
            String insertSql = "INSERT INTO users(username, email, password, blocked) VALUES(?, ?, ?, false)";
            PreparedStatement insertPs = conn.prepareStatement(insertSql);

            insertPs.setString(1, username);
            insertPs.setString(2, email != null ? email.trim().toLowerCase() : "");
            insertPs.setString(3, password);

            int rows = insertPs.executeUpdate();
            System.out.println("User registered with direct password: " + username + " -> " + password);

            return rows > 0;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean register(String username, String password) {
        return register(username, null, password);
    }

    // LOGIN (Direct Password Match)
    public boolean login(String username, String password) {
        try (Connection conn = dataSource.getConnection()) {
            String sql = "SELECT * FROM users WHERE username=? AND password=?";
            PreparedStatement ps = conn.prepareStatement(sql);

            ps.setString(1, username);
            ps.setString(2, password);

            ResultSet rs = ps.executeQuery();
            return rs.next();
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}