// package com.prochat.repository;

// public class UserRepository {
    
// }
package com.prochat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.prochat.model.User;

public interface UserRepository extends JpaRepository<User, Integer> {
    User findByUsername(String username);
}
