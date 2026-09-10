// package com.prochat.repository;

// public class AdminRepositoy {
    
// }
package com.prochat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.prochat.model.Admin;

public interface AdminRepository extends JpaRepository<Admin, Integer> {
    Admin findByUsername(String username);
}