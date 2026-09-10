package com.prochat.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.prochat.model.Reminder;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findAllByOrderByIdDesc();
    List<Reminder> findByStatusOrderByIdDesc(String status);
}
