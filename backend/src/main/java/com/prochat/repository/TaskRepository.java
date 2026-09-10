package com.prochat.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.prochat.model.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findAllByOrderByIdDesc();
    List<Task> findByModeOrderByIdDesc(String mode);
    List<Task> findByAssignedToOrderByIdDesc(String assignedTo);
}
